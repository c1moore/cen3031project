'use strict';

/*jshint expr:true */

/**
* Module dependencies.
*/
var should = require('should'),
	mongoose = require('mongoose'),
	http = require('http'),
	config = require('../../config/config'),
	request = require('supertest'),
	agent=require('superagent'),
	Candidate = mongoose.model('Candidate'),
	User = mongoose.model('User'),
	Evnt = mongoose.model('Event');

/**
* Globals
*/
var candidate1, candidate2, user, acceptedCandidate,attendee, attendee2, recruiter, event1, event2, event3, event4, tempNewCandidate,
	userAgent = agent.agent(), attendeeAgent2 = agent.agent(), attendeeAgent = agent.agent(), tempAgent = agent.agent(), recruiterAgent = agent.agent();

function arraysEqual(array0,array1) {
	if (array0.length !== array1.length) return false;
	for (var i = 0; i<array0.length; i++) {
		if (array0[i] !== array1[i]) return false;
	}
	return true;
}

describe('Candidate Route Integration Tests:', function() {
	before(function(done) {
		//Remove all data from database so any previous tests that did not do this won't affect these tests.
		User.remove(function() {
			Evnt.remove(function() {
				Candidate.remove(function() {
					done();
				});				
			});
		});
	});

	beforeEach(function(done){
		this.timeout(10000);

		var millisInMonth = new Date(1970, 0, 31, 11, 59, 59).getTime();			//Number of milliseconds in a typical month.
		var startDate = new Date(Date.now() + millisInMonth).getTime();				//Start date for 1 month from now.
		var endDate = new Date(Date.now() + millisInMonth + 86400000).getTime();	//Event lasts 1 day

		event1 = new Evnt({
			name:  'testing1231',
			start_date: startDate,
			end_date:  endDate,
			location: 'UF',
			schedule: 'www.google.com'
		});

		event2 = new Evnt({
			name:  'testing1232',
			start_date: startDate,
			end_date:  endDate,
			location: 'SFCC',
			schedule: 'www.google.com'
		});

		event3 = new Evnt({
			name:  'testing1233',
			start_date: startDate,
			end_date:  endDate,
			location: 'Orlando',
			schedule: 'www.google.com'
		});

		event4 = new Evnt({
			name:  'testing1234',
			start_date: startDate,
			end_date:  endDate,
			location: 'Tampa',
			schedule: 'www.google.com'
		});

		event1.save(function(err) {
			if(err) return done(err);

			event2.save(function(err) {
				if(err) return done(err);

				event3.save(function(err){
					if(err) return done(err);

					event4.save(function(err){
						if(err) return done(err);

						user = new User({
							fName: 'Test',
							lName: 'ing',
							roles: ['admin'],
							email: 'test@test.com',
							password: 'password',
							login_enabled: true
						});

						attendee = new User({
							fName: 'attendee',
							lName: 'Testing',
							roles: ['attendee'],
							email: 'test1234@test.com',
							status: [{event_id: event2._id, attending: false, recruiter: false}],
							password: 'password',
							login_enabled: true
						});

						attendee2 = new User({
							fName: 'John',
							lName: 'Doe',
							roles: ['attendee'],
							email: 'test321@test.com',
							status: [{event_id: event2._id, attending: false, recruiter: false}],
							password: 'password',
							login_enabled: true
						});

						candidate1 = new Candidate({
							fName : 'Full',
							lName : 'Name',
							email : 'test@test.com',
							//status : 'volunteer',
							events: [{event_id: event1._id, accepted: false,status: 'volunteer'},{event_id:event2._id,accepted:false,status:'volunteer'}],
							note : 'this is a test',
							user_id: attendee._id
						});

						candidate2 = new Candidate({
							fName : 'John',
							lName : 'Doe',
							email : 'test321@test.com',
							//status : 'volunteer',
							events: [{event_id:event2._id,accepted:true,status:'volunteer'}],
							note : 'this is a test',
							user_id: attendee2._id
						});
			
						acceptedCandidate = new Candidate({
							fName : 'Jane',
							lName : 'Doe',
							email : 'jDoe@test.com',
							events: [{event_id:event2._id,accepted:true,status:'volunteer'}],
							note : 'this is a test'
						});

						recruiter = new User({
							fName: 'attendee',
							lName: 'Testing',
							roles: ['recruiter'],
							email: 'test12@test.com',
							password: 'password',
							login_enabled: true
						});
					
						acceptedCandidate.save(function(err,res){
							if(err) return done(err);
							
							if(res._id.toString() !== acceptedCandidate._id.toString()) {
								return done(new Error("acceptedCandidate not saved correctly."));
							}

							attendee2.save(function(err,res){
								if(err) return done(err);
								
								if(res._id.toString() !== attendee2._id.toString()) {
									return done(new Error("attendee2 not saved correctly."));
								}

								candidate2.save(function(err,res){
									if(err) return done(err);
									
									if(res._id.toString() !== candidate2._id.toString()) {
										return done(new Error("candidate2 not saved correctly."));
									}

									recruiter.save(function(err,res){
										if(err) return done(err);
										
										if(res._id.toString() !== recruiter._id.toString()) {
											return done(new Error("recruiter not saved correctly."));
										}

										attendee.save(function(err, res) {
											if(err) return done(err);
											
											if(res._id.toString() !== attendee._id.toString()) {
												return done(new Error("attendee not saved correctly."));
											}

											user.save(function(err, res) {
												if(err) return done(err);

												if(res._id.toString() !== user._id.toString()) {
													return done(new Error("user not saved correctly."));
												}

												candidate1.save(function(err, res) {
													if(err) return done(err);

													if(res._id.toString() !== candidate1._id.toString()) {
														return done(new Error("candidate1 not saved correctly."));
													}

													attendeeAgent
														.post('http://localhost:3001/auth/signin')
														.send({'email': attendee2.email, 'password': 'password'})
														.end(function (err, res) {
															if(err) return done(err);

															if(res.status !== 200) {
																return done(new Error("attendeeAgent could not log in."));
															}

															recruiterAgent
																.post('http://localhost:3001/auth/signin')
																.send({'email': recruiter.email, 'password':'password'})
																.end(function(err,res){
																	if(err) return done(err);

																	if(res.status !== 200) {
																		return done(new Error("recruiterAgent could not log in. " + res.body.message));
																	}

																	attendeeAgent2
																		.post('http://localhost:3001/auth/signin')
																		.send({'email': attendee.email, 'password': 'password'})
																		.end(function (err, res) {
																			if(err) return done(err);

																			if(res.status !== 200) {
																				return done(new Error("attendeeAgent2 could not log in."));
																			}

																			userAgent
																				.post('http://localhost:3001/auth/signin')
																				.send({'email': user.email, 'password': 'password'})
																				.end(function (err, res) {
																					if(err) return done(err);

																					if(res.status !== 200) {
																						return done(new Error("userAgent could not log in."));
																					}

																					done();
																				});
																		});
																});
														});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	it("should save the user.", function(done) {
		var query = User.findOne({"email" : user.email});
		query.exec(function(err, res) {
			done(err);
		});
	});

	describe('Admin route tests:', function() {
		describe('Obtain candidate information:', function() {
			it("should return all of the candidates in the db.", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/getCandidates')
					.end(function(err, res) {
						should.not.exist(err);
						res.status.should.equal(200);
						res.body.length.should.equal(3);
						done();
					});
			});

			it("should return an error when the user is a recruiter.", function(done) {
				recruiterAgent
					.post('http://localhost:3001/candidate/getCandidates')
					.end(function(err, res) {
						should.not.exist(err);
						res.status.should.equal(401);
						res.body.message.should.equal("User does not have permission.");
						done();
					});
			});

			it("should return an error when the user is an attendee.", function(done) {
				attendeeAgent2
					.post('http://localhost:3001/candidate/getCandidates')
					.end(function(err, res) {
						should.not.exist(err);
						res.status.should.equal(401);
						res.body.message.should.equal("User does not have permission.");
						done();
					});
			});

			it("should return an error when the user is not logged in.", function(done) {
				tempAgent
					.post('http://localhost:3001/candidate/getCandidates')
					.end(function(err, res) {
						should.not.exist(err);
						res.status.should.equal(401);
						res.body.message.should.equal("User is not logged in.");
						done();
					});
			});

			it("admin should be able to get the candidate first name", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/getfName')
					.send({candidate_id: candidate1._id})
					.end(function(err,res) {
						if (err) throw err;

						res.status.should.equal(200);
						res.body.should.have.property('fName');
						res.body.fName.should.be.equal('Full');

						done();
					});
			});

			it("admin should be able to get the candidate last name", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/getlName')
					.send({candidate_id: candidate1._id})
					.end(function(err,res) {
						if (err) throw err;

						res.status.should.equal(200);
						res.body.should.have.property('lName');
						res.body.lName.should.be.equal('Name');

						done();
					});
			});

			it("admin should be able to get the candidate email", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/getEmail')
					.send({candidate_id: candidate1._id})
					.end(function(err,res) {
						if (err) throw err;
						
						res.status.should.equal(200);
						res.body.should.have.property('email');
						res.body.email.should.be.equal('test@test.com');
						
						done();
					});
			});
	/* 	it("admin should be able to get the candidate status", function(done) {
				userAgent
				.post('http://localhost:3001/candidate/getStatus')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;
					res.status.should.equal(200);
					res.body.should.have.property('status');
					res.body.status.should.be.equal('volunteer');
					done();
				});
			});

	*/
			it("admin should be able to get the candidate EventsID", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/getEvents')
					.send({candidate_id: candidate1._id})
					.end(function(err,res) {
						if (err) throw err;

						res.status.should.equal(200);
						res.body.should.have.property('events');
						(res.body.events[0].event_id.name.toString()).should.be.equal(event1.name);
						(res.body.events[0].accepted.toString()).should.be.equal('false');
						(res.body.events[0].status.toString()).should.be.equal('volunteer');
						(res.body.events[1].event_id.name.toString()).should.be.equal(event2.name);
						(res.body.events[1].accepted.toString()).should.be.equal('false');
						(res.body.events[1].status.toString()).should.be.equal('volunteer');

						done();
					});
			});

			it("admin should be able to get the candidate note", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/getNote')
					.send({candidate_id: candidate1._id})
					.end(function(err,res) {
						if (err) throw err;

						res.status.should.equal(200);
						res.body.should.have.property('note');
						res.body.note.should.be.equal('this is a test');

						done();
					});
			});

			it("admin should be able to get the candidate getUser_id", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/getUser_id')
					.send({candidate_id: candidate1._id})
					.end(function(err,res) {
						if (err) throw err;
						
						res.status.should.equal(200);
						res.body.should.have.property('user_id');
						res.body.user_id.should.be.equal((attendee._id).toString());
						
						done();
					});
			});
		});

		describe("Set candidate information: ", function() {
			it("admin should be able to set the candidate first name", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/setfName')
					.send({candidate_id: candidate1._id,fName:'dan'})
					.end(function(err,res) {
						if (err) throw err;

						res.status.should.equal(200);

						userAgent
							.post('http://localhost:3001/candidate/getfName')
							.send({candidate_id: candidate1._id})
							.end(function(err,res1) {
								if (err) throw err;

								res1.status.should.equal(200);
								res1.body.should.have.property('fName');
								res1.body.fName.should.be.equal('dan');

								done();
							});
					});
			});

			it("admin should be able to set the candidate last name", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/setlName')
					.send({candidate_id: candidate1._id,lName:'pickle'})
					.end(function(err,res) {
						if (err) throw err;
			
						res.status.should.equal(200);
			
						userAgent
							.post('http://localhost:3001/candidate/getlName')
							.send({candidate_id: candidate1._id})
							.end(function(err,res1) {
								if (err) throw err;
			
								res1.status.should.equal(200);
								res1.body.should.have.property('lName');
								res1.body.lName.should.be.equal('pickle');
			
								done();
							});
					});

			});

			it("admin should be able to set the candidate email", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/setEmail')
					.send({candidate_id: candidate1._id,email:'DanP@test.com'})
					.end(function(err,res) {
						if (err) throw err;
			
						res.status.should.equal(200);
			
						userAgent
							.post('http://localhost:3001/candidate/getEmail')
							.send({candidate_id: candidate1._id})
							.end(function(err,res1) {
								if (err) throw err;
			
								res1.status.should.equal(200);
								res1.body.should.have.property('email');
								res1.body.email.should.be.equal('DanP@test.com');
			
								done();
							});
					});
			});

			it("admin should be able to set the candidate status", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/setStatus')
					.send({'candidate_id' : candidate1._id, 'event_id': event2._id, 'status': 'accepted'})
					.end(function(err,res) {
						if (err) throw err;

						res.status.should.equal(200);

						userAgent
							.post('http://localhost:3001/candidate/getEvents')
							.send({candidate_id: candidate1._id})
							.end(function(err,res) {
								if (err) throw err;
			
								res.status.should.equal(200);
								res.body.should.have.property('events');

								(res.body.events[0].event_id._id.toString()).should.be.equal(event1._id.toString());
								(res.body.events[0].accepted.toString()).should.be.equal('false');
								(res.body.events[0].status.toString()).should.be.equal('volunteer');
								(res.body.events[1].event_id._id.toString()).should.be.equal(event2._id.toString());
								(res.body.events[1].accepted.toString()).should.be.equal('false');
								(res.body.events[1].status.toString()).should.be.equal('accepted');
			
								done();
							});
					});
			});

			it("admin should be able to add(set) candidate event", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/addEvent')
					.send({candidate_id: candidate1._id, event_id: event3._id})
					.end(function(err,res) {
						if (err) throw err;

						res.status.should.equal(200);

						userAgent
							.post('http://localhost:3001/candidate/getEvents')
							.send({candidate_id: candidate1._id})
							.end(function(err,res) {
								if (err) throw err;

								res.status.should.equal(200);
								res.body.should.have.property('events');
								candidate1.events.length.should.be.lessThan(res.body.events.length);

								(res.body.events[0].event_id._id.toString()).should.be.equal(event1._id.toString());
								(res.body.events[0].accepted.toString()).should.be.equal('false');
								(res.body.events[1].event_id._id.toString()).should.be.equal(event2._id.toString());
								(res.body.events[1].accepted.toString()).should.be.equal('false');
								(res.body.events[2].event_id._id.toString()).should.be.equal(event3._id.toString());
								(res.body.events[2].accepted.toString()).should.be.equal('false');

								done();
							});
					});
			});

			it("admin should be able to set candidate event accepted field", function(done) {
				var i;
				for(i=0; i<candidate1.events.length; i++) {
					if(candidate1.events[i].event_id.toString() === event2._id.toString()) {
						candidate1.events[i].accepted.should.be.false;
						break;
					}
				}
				
				i.should.not.equal(candidate1.events.length);

				userAgent
					.post('http://localhost:3001/candidate/setAccepted')
					.send({'candidate_id' : candidate1._id, 'event_id': event2._id, 'accepted': true})
					.end(function(err,res) {
						if (err) throw err;

						res.status.should.equal(200);

						userAgent
							.post('http://localhost:3001/candidate/getEvents')
							.send({candidate_id: candidate1._id})
							.end(function(err,res) {
								if (err) throw err;

								res.status.should.equal(200);
								res.body.should.have.property('events');

								for(i=0; i<res.body.events.length; i++) {
									if(res.body.events[i].event_id._id.toString() === event2._id.toString()) {
										res.body.events[i].accepted.should.be.true;
										break;
									}
								}
						
								i.should.not.equal(res.body.events.length);

								done();
							});
					});
			});

			//This test originally tested that the attendeeAgent2 should now be a recruiter; however, the status field of the attendee object was only 'volunteer' so they
			//should not yet be a volunteer.
			it('Should not have changed the attendee user to a recruiter for the roles and status fields',function(done){
				attendeeAgent2
					.get('http://localhost:3001/recruiter/events')
					.end(function(err,res){
						if (err) throw err;
						
						res.status.should.equal(401);

						done();
					});
			});

			it("admin should be able to set candidate event status field", function(done) {
				candidate2.save(function(err) {
					if(err) {
						throw err;
					}

					var i;
					for(i=0; i<candidate2.events.length; i++) {
						if(candidate2.events[i].event_id.toString() === event2._id.toString()) {
							candidate2.events[i].status.should.equal('volunteer');
							break;
						}
					}

					i.should.not.equal(candidate2.events.length);

					userAgent
						.post('http://localhost:3001/candidate/setStatus')
						.send({'candidate_id' : candidate2._id, 'event_id': event2._id, 'status': 'accepted'})
						.end(function(err,res) {
							if (err) throw err;
							res.status.should.equal(200);

							userAgent
								.post('http://localhost:3001/candidate/getEvents')
								.send({candidate_id: candidate2._id})
								.end(function(err,res) {
									if (err) throw err;

									res.status.should.equal(200);
									res.body.should.have.property('events');

									for(i=0; i<res.body.events.length; i++) {
										if(res.body.events[i].event_id._id.toString() === event2._id.toString()) {
											res.body.events[i].status.should.equal('accepted');
											break;
										}
									}
			
									i.should.not.equal(res.body.events.length);

									done();
								});
						});
				});
			});

			it('should update the candidate\'s role when both an admin and the candidate have accepted the recruiter position for this event.' ,function(done){
				candidate2.save(function(err) {
					if(err)
						return done(err);

					userAgent
						.post('http://localhost:3001/candidate/setStatus')
						.send({candidate_id : candidate2._id, event_id : event2._id, status : 'accepted'})
						.end(function(err, res) {
							should.not.exist(err);
							res.status.should.equal(200);

							attendeeAgent
								.get('http://localhost:3001/recruiter/events')
								.end(function(err,res){
									if (err) throw err;
									res.status.should.equal(200);

									res.body[0].event_id._id.toString().should.equal(event2._id.toString());

									done();
								});
						});
				});
			});


			it("Should automatically create a new user when a candidate accepts and is accepted to become a recruiter if they are not already a user", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/setStatus')
					.send({'candidate_id' : acceptedCandidate._id, 'event_id': event2._id, 'status': 'accepted'})
					.end(function(err,res) {
						if (err) throw err;

						res.status.should.equal(200);
						userAgent
							.post('http://localhost:3001/candidate/getEvents')
							.send({candidate_id: acceptedCandidate._id})
							.end(function(err,res) {
								if (err) throw err;

								res.status.should.equal(200);
								res.body.should.have.property('events');

								(res.body.events[0].event_id.name.toString()).should.be.equal(event2.name);
								(res.body.events[0].accepted.toString()).should.be.equal('true');
								(res.body.events[0].status.toString()).should.be.equal('accepted');

								var query = User.findOne({'email': acceptedCandidate.email});
								query.exec(function(err, user){
									(user.email === undefined).should.be.false;
									user.email.should.equal(acceptedCandidate.email);

									Candidate.findOne({'email' : acceptedCandidate.email}, function(err, candidate) {
										candidate.user_id.toString().should.equal(user._id.toString());
										done();
									});
								});
							});
					});
			});


			it("admin should be able to set the candidate's note", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/setNote')
					.send({candidate_id: candidate1._id,note:'I have changed the candidate note'})
					.end(function(err,res) {
						if (err) throw err;
						res.status.should.equal(200);

						userAgent
							.post('http://localhost:3001/candidate/getNote')
							.send({candidate_id: candidate1._id})
							.end(function(err,res1) {
								if (err) throw err;

								res1.status.should.equal(200);
								res1.body.should.have.property('note');
								res1.body.note.should.be.equal('I have changed the candidate note');

								done();
							});
					});
			});

			it("admin should be able to set a new candidate", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/setCandidate')
					.send({fName: 'John', lName: 'Smith', email:'JohnS@test.com', events : [event1._id]})
					.end(function(err,res) {
						if (err) throw err;
						
						res.status.should.equal(200);

						Candidate.findOne({email : 'JohnS@test.com'}, function(err, newCandidate) {
							if(err) {
								throw err;
							}

							newCandidate.events[0].event_id.toString().should.equal(event1._id.toString());
							newCandidate.events[0].accepted.should.equal(false);
							newCandidate.events[0].status.should.equal('volunteer');
			
							userAgent
								.post('http://localhost:3001/candidate/getfName')
								.send({candidate_id: newCandidate._id})
								.end(function(err,res1) {
									if (err) throw err;

									res1.status.should.equal(200);
									res1.body.should.have.property('fName');
									res1.body.fName.should.be.equal('John');

									done();
								});
						});
					});
			});

			it("admin should be able to delete a candidate", function(done) {
				userAgent
					.post('http://localhost:3001/candidate/deleteCandidate')
					.send({candidate_id: candidate1._id})
					.end(function(err,res) {
						if (err) throw err;
						
						res.status.should.equal(200);			
						
						Candidate.findOne({email : candidate1.email}, function(err, res) {
							should.not.exist(err);
							should.not.exist(res);

							done();
						});
					});
			});
		});
	});

	describe('Attendee route tests:', function() {
		it("attendee should be able to volunteer as a new candidate", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/setCandidate')
				.send({event_id: event1._id})
				.end(function(err,res) {
					if (err) throw err;
					
					res.status.should.equal(200);
					
					tempNewCandidate=res.body;

					userAgent
						.post('http://localhost:3001/candidate/getEvents')
						.send({candidate_id: tempNewCandidate._id})
						.end(function(err,res1) {
							if (err) throw err;

							res1.status.should.equal(200);
							res1.body.should.have.property('events');
							res1.body.events.length.should.equal(1);
							res1.body.events[0].event_id._id.toString().should.equal(event1._id.toString());

							done();
						});
				});
		});

		it("attendees should NOT be able to get the candidate first name", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/getfName')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;
					
					res.status.should.equal(401);
					res.body.should.have.should.not.have.property('fName');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});


		it("attendees should NOT be able to get the candidate last name", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/getlName')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.should.not.have.property('lName');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});


		it("attendees should NOT be able to get the candidate email", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/getEmail')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;
					
					res.status.should.equal(401);
					res.body.should.not.have.property('email');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});

		//This has been commented out in the routes and controller.  Until I figure out why, this should remain commented out too.
		/*it("attendees should NOT be able to get the candidate status", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/getStatus')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.should.not.have.property('status');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});*/
	


		it("attendees should NOT be able to get the candidate EventsID", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/getEvents')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.should.not.have.property('events');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});

		it("attendees should NOT be able to get the candidate note", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/getNote')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.should.not.have.property('note');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});

		//Added by henfredemars 6 Dec 2014
		it("attendees should not be able to delete candidates", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/deleteCandidate')
				.send({candidate_id: candidate1._id})
				.end(function(err, res) {
					should.not.exist(err);

					res.status.should.be.equal(401);
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});

		it("attendees should not be able to delete candidates by event either", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/deleteCandidate/event')
				.send({candidate_id: candidate1._id, event_id: event1._id})
				.end(function(err, res) {
					should.not.exist(err);

					res.status.should.be.equal(401);
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});
		//End henfredemars addition 6 Dec 2014

		it("attendees should NOT be able to get the candidate getUser_id", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/getUser_id')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.should.not.have.property('user_id');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});

		it("attendees should NOT be able to set the candidate first name", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/setfName')
				.send({candidate_id: candidate1._id,fName:'blah'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.fName.should.equal(candidate1.fName);

						done();
					});
				});
		});

		it("attendees should NOT be able to set the candidate last name", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/setlName')
				.send({candidate_id: candidate1._id,lName:'Blah'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.lName.should.equal(candidate1.lName);

						done();
					});
				});
		});

		it("attendees should NOT be able to set the candidate email", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/setEmail')
				.send({candidate_id: candidate1._id,email:'blah@test.com'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.email.should.equal(candidate1.email);

						done();
					});
				});
		});

		it("attendees should NOT be able to set the candidate status", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/setStatus')
				.send({candidate_id: candidate1._id,'event_id': event2._id, status:'accepted'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						/**
						* Since all the statuses for this event are initially volunteer, we do not have to
						* check each individual event against its ID to determine which status it should have.
						*/
						for(var i = 0; i < res.events.length; i++) {
							res.events[i].status.should.equal('volunteer');
						}

						done();
					});
				});
		});
		
		it("attendees should NOT be able to add(set) candidate event", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/setAccepted')
				.send({candidate_id: candidate1._id, event_id: event4._id, accepted: false})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.events.length.should.equal(candidate1.events.length);

						done();
					});
				});
		});

		it("attendees should NOT be able to set the candidate's note", function(done) {
			attendeeAgent2
				.post('http://localhost:3001/candidate/setNote')
				.send({candidate_id: candidate1._id,note:'blah'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.note.should.equal(candidate1.note);

						done();
					});
				});
		});

		it("attendee should be able to volunteer as a new candidate", function(done) {
			Candidate.count({}, function(err, scount) {
				if(err) return done(err);

				recruiterAgent
					.post('http://localhost:3001/candidate/setCandidate')
					.send({event_id: event1._id})
					.end(function(err,res) {
						if (err) throw err;

						res.status.should.equal(200);
						tempNewCandidate=res.body;

						userAgent
							.post('http://localhost:3001/candidate/getfName')
							.send({candidate_id: tempNewCandidate._id})
							.end(function(err,res1) {
								if (err) throw err;

								res1.status.should.equal(200);
								res1.body.should.have.property('fName');
								res1.body.fName.should.be.equal(recruiter.fName);

								Candidate.count({}, function(err, fcount) {
									if(err) return done(err);

									fcount.should.be.greaterThan(scount);

									done();
								});
							});
					});
			});
		});
	});

	describe('Recruiter route tests:', function() {
		it("recruiters should NOT be able to get the candidate first name", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/getfName')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.should.have.should.not.have.property('fName');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});

		it("recruiters should NOT be able to get the candidate last name", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/getlName')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.should.not.have.property('lName');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});

		it("recruiters should NOT be able to get the candidate email", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/getEmail')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.should.not.have.property('email');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});

		/*it("recruiters should NOT be able to get the candidate status", function(done) {
			recruiterAgent
			.post('http://localhost:3001/candidate/getStatus')
			.send({candidate_id: candidate1._id})
			.end(function(err,res) {
				if (err) throw err;
				res.status.should.equal(401);
				res.body.should.not.have.property('status');
				//res.body.status.should.be.equal('volunteer');
				done();
			});
		});
	*/

		it("recruiters should NOT be able to get the candidate EventsID", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/getEvents')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.should.not.have.property('events');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});

		it("recruiters should NOT be able to get the candidate note", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/getNote')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.should.not.have.property('note');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});

		it("recruiters should NOT be able to get the candidate getUser_id", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/getUser_id')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.should.not.have.property('user_id');
					res.body.message.should.equal("User does not have permission.");

					done();
				});
		});

		it("recruiters should NOT be able to set the candidate first name", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/setfName')
				.send({candidate_id: candidate1._id,fName:'blah'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.fName.should.equal(candidate1.fName);

						done();
					});
				});

		});

		it("recruiters should NOT be able to set the candidate last name", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/setlName')
				.send({candidate_id: candidate1._id,lName:'Blah'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.lName.should.equal(candidate1.lName);

						done();
					});
				});
		});

		it("recruiters should NOT be able to set the candidate email", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/setEmail')
				.send({candidate_id: candidate1._id,email:'blah@test.com'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.email.should.equal(candidate1.email);

						done();
					});
				});
		});

		it("recruiters should NOT be able to set the candidate status", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/setStatus')
				.send({candidate_id: candidate1._id,'event_id': event2._id, status:'invited'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						for(var i=0; i < res.events.length; i++) {
							res.events[i].status.should.equal("volunteer");
						}

						done();
					});
				});
		});
		
		it("recruiters should NOT be able to set candidate accepted field", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/setAccepted')
				.send({candidate_id: candidate1._id, event_id : event1._id, accepted : true})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						for(var i=0; i < res.events.length; i++) {
							res.events[i].accepted.should.be.false;
						}

						done();
					});
				});
		});

		it("recruiters should NOT be able to set the candidate's note", function(done) {
			recruiterAgent
				.post('http://localhost:3001/candidate/setNote')
				.send({candidate_id: candidate1._id,note:'blah'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User does not have permission.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.note.should.equal(candidate1.note);

						done();
					});
				});
		});
	});

	describe('Guest route tests:', function() {
		it("guests should NOT be able to volunteer as a new candidate", function(done) {
			Candidate.count({}, function(err, scount) {
				if(err) return done(err);

				tempAgent
					.post('http://localhost:3001/candidate/setCandidate')
					.send({fName : recruiter.fName, lName : recruiter.lName, email : recruiter.email, newEvent : event1._id})
					.end(function(err,res) {
						if (err) throw err;

						res.status.should.equal(401);
						res.body.message.should.equal("User is not logged in.");

						Candidate.count({}, function(err, fcount) {
							scount.should.equal(fcount);

							done();
						});
					});
			});
		});

		it("guest should NOT be able to get the candidate first name", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/getfName')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User is not logged in.");
					res.body.should.have.should.not.have.property('fName');

					done();
				});
		});

		it("guest should NOT be able to get the candidate last name", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/getlName')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User is not logged in.");
					res.body.should.not.have.property('lName');

					done();
				});
		});

		it("guest should NOT be able to get the candidate email", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/getEmail')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User is not logged in.");
					res.body.should.not.have.property('email');

					done();
				});
		});

	/* it("guest should NOT be able to get the candidate status", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/getStatus')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;
					res.status.should.equal(401);
					res.body.should.not.have.property('status');
					//res.body.status.should.be.equal('volunteer');
					done();
				});
		});*/

		it("guest should NOT be able to get the candidate EventsID", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/getEvents')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User is not logged in.");
					res.body.should.not.have.property('events');

					done();
				});
		});

		it("guest should NOT be able to get the candidate note", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/getNote')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User is not logged in.");
					res.body.should.not.have.property('note');

					done();
				});
		});

		it("guest should NOT be able to get the candidate getUser_id", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/getUser_id')
				.send({candidate_id: candidate1._id})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User is not logged in.");
					res.body.should.not.have.property('user_id');

					done();
				});
		});

		it("guest should NOT be able to set the candidate first name", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/setfName')
				.send({candidate_id: candidate1._id,fName:'blah'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User is not logged in.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.fName.should.equal(candidate1.fName);

						done();
					});
				});
		});

		it("guest should NOT be able to set the candidate last name", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/setlName')
				.send({candidate_id: candidate1._id,lName:'Blah'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User is not logged in.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.lName.should.equal(candidate1.lName);

						done();
					});
				});
		});

		it("guest should NOT be able to set the candidate email", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/setEmail')
				.send({candidate_id: candidate1._id,email:'blah@test.com'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User is not logged in.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.email.should.equal(candidate1.email);

						done();
					});
				});
		});

		it("guest should NOT be able to set the candidate status", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/setStatus')
				.send({candidate_id: candidate1._id,'event_id': event2._id, status:'invited'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User is not logged in.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						for(var i = 0; i < res.events.length; i++) {
							res.events[i].status.should.equal("volunteer");
						}

						done();
					});
				});
		});

		it("guest should NOT be able to set candidate event accepted field", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/setAccepted')
				.send({'candidate_id' : candidate1._id, 'event_id': event2._id, 'accepted': true})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal('User is not logged in.');

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						for(var i=0; i < res.events.length; i++) {
							res.events[0].accepted.should.be.false;
						}

						done();
					});
				});
		});

		it("guest should NOT be able to set the candidate's note", function(done) {
			tempAgent
				.post('http://localhost:3001/candidate/setNote')
				.send({candidate_id: candidate1._id,note:'blah'})
				.end(function(err,res) {
					if (err) throw err;

					res.status.should.equal(401);
					res.body.message.should.equal("User is not logged in.");

					Candidate.findOne({_id : candidate1._id}, function(err, res) {
						should.not.exist(err);

						res.note.should.equal(candidate1.note);

						done();
					});
				});
		});
	});

	afterEach(function(done) {
		Candidate.remove(function(err) {
			if(err)
				return done(err);

			User.remove(function(err) {
				if(err)
					return done(err);

				Evnt.remove(function(err){
					if(err)
						return done(err);

					done();
				});
			});
		});
	});
});

