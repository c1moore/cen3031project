'use strict';

/**
 * Module dependencies.
 */
var errorHandler = require('../errors'),
	mongoose = require('mongoose'),
	_ = require('lodash'),
	nodemailer = require('nodemailer'),
	User = mongoose.model('User'),
	config = require('../../../config/config'),
	crypto = require('crypto'),
	async = require('async');

/*
* Helper function to search through one of the lists (invitee, attendee, almost) and return only those users who are attending the
* specified event.
*
* ONLY WORKS IF event_id HAS NOT BEEN POPULATED.
*/

var searchByEvent = function(eventID, arr) {
	var temp = [], j=0;
	for(var i=0; i<arr.length; i++) {
		if(arr[i].event_id.toString() === eventID.toString()) {
			temp[j] = arr[i];
			j++;
		}
	}

	return temp;
};

/*
* Create a temporary password.  This password will not be seen by the invitee, but is just a placeholder for the required password field.
*/
var tempPass = function() {
	temp = new Buffer(crypto.randomBytes(32).toString('base64'), 'base64');
	var num = _.random(0, 7);
	for(var i=0; i<num; i++) {
		temp = temp.splice(_.random(0, temp.length), 1);
	}

	return temp;
};

/*
* Update the rank of all recruiters for the specified event.
*/
var updateRanks = function(event_id) {
	User.aggregate([
		{$match : {'status.event_id' : req.body.event_id, 'status.recruiter' : true}},
		{$unwind : {'attendeeList'}},
		{$unwind : {'inviteeList'}},
		{$unwind : {'rank'}},
		{$match : {$or[{'attendeeList.event_id' : event_id}, {'inviteeList.event_id' : event_id}]}},
		{$project : {'rank' : 1, 'attendeeLength' : this.attendeeList.length, 'inviteeLength' : this.inviteeList.length}},		//A better solution than this may be to add an additional field to the User schema and a presave method that will update this field everytime a user object is updated.
		{$sort : {'attendeeLength' : -1, 'inviteeLength' : -1}},
	], function(err, result) {
		var aqueue = async.queue(function(recruiter, callback) {
			User.findOne({'_id' : recruiter._id}, function(err, result) {
				if(!err) {
					for(var i=0; i<result.rank.length; i++) {
						if(result.rank[i].event_id.toString() === event_id.toString()) {
							result.rank.place = recruiter.place;
							result.save(callback);
							break;
						}
					}
				}
			})
		}, 100000)
		for(var i=0; i<result.length; i++) {
			var recruiter = {'_id' : result[i]._id, 'place' : i};
			aqueue.push(recruiter);
		}
	});
}


/*
* Return the user's displayname (Last, First).
*/
exports.getDisplayName = function(req, res) {
	if(!req.isAuthenticated())
		res.status(401).send({'message' : 'User is not logged in.'});
	else {
		var id = req.user._id;
		var query = User.findOne({'_id':id});
		query.exec(function(err,result) {
			if(err) {
				res.status(400).send(err);
			} else if(!result) {
				res.status(400).json({"message": "No display name found!"});
			} else {
				res.status(200).json({'displayName' : result.displayName});
			}
		});
	}
};

/*
* Get the data that will be displayed for in the leaderboard.  This data includes all of the recruiter names, their rank,
* and the inviteeList and attendeeList, properly populated with the displayName of each user in one of these lists.
*/
exports.getLeaderboard = function(req, res) {
	if(req.body.event_id === undefined) {
		res.status(400).send({'message' : 'Event not specified.'});
		return;
	}
	if(!req.isAuthenticated()) {
		res.status(401).send({'message' : "User is not logged in."});
	} else if(req.hasAuthorization(req.user, ["recruiter", "admin"])) {
		var query = User.find({'roles' : 'recruiter', 'status.event_id' : req.body.event_id, 'status.recruiter' : true});
		query.select('fName lName rank inviteeList attendeeList');
		query.populate('inviteeList.user_id', 'displayName email');
		query.populate('attendeeList.user_id', 'displayName email');
		query.exec(function(err, result) {
			if(err) {
				res.status(400).send(err);
			} else if(!result.length) {
				res.status(400).send({message : 'No recruiters found!'});
			} else {
				for(var i=0; i<result.length; i++) {
					result[i] = result[i].toObject();
					result[i].inviteeList = searchByEvent(req.body.event_id, result[i].inviteeList);
					result[i].attendeeList = searchByEvent(req.body.event_id, result[i].attendeeList);

					for(var j=0; j<result[i].rank.length; j++) {
						if(result[i].rank[j].event_id.toString() === req.body.event_id.toString()) {
							var temp = parseInt(result[i].rank[j].place);
							delete result[i].rank;//result[i].rank = null;
							result[i].place = temp;//result[i].rank[j].place;
							break;
						}
					}
				}

				res.status(200).send(result);
			}
		});
	} else {
		res.status(401).send({'message' : "User does not have permission."});
	}
};

/*
* Get a list of events for which this user is a recruiter.  The method first queries the database for the currently logged in recruiter,
* then, if found, goes through the array of all events with which this recruiter is associated and returns only those events for which the
* user is a recruiter.
*/
exports.getRecruiterEvents = function(req, res) {
	if(!req.isAuthenticated()) {
		res.status(401).send({'message' : 'User is not logged in.'});
	} else if(req.hasAuthorization(req.user, ["recruiter", "admin"])) {
		var id = req.user._id;
		var query = User.findOne({'_id' : id});
		query.select('status');
		query.populate('status.event_id');
		query.exec(function(err, result) {
			if(err) {
				res.status(400).send(err);
			} else if(!result) {
				res.status(400).json({message : 'User not found or is not a recruiter!'});
			} else {
				var events = [], j=0;
				for(var i=0; i<result.status.length; i++) {
					if(result.status[i].recruiter) {
						events[j] = result.status[i];
						j++;
					}
				}
				res.status(200).send(events);
			}
		});
	} else {
		res.status(401).send({'message' : 'User does not have permission.'});
	}
};

/*
* Get the list of attendees for the event specified and the recruiter that is currently logged in.
*/
/*This method will need to be modified so it will return only the attendees for the specified event.  This should be simple,
simply replace the the definition of query with the following line:
	var query = User.findOne({'_id' : id, 'attendeeList.event_id' : req.});*/
exports.getRecruiterAttendees = function(req, res) {
	if(req.body.event_id === undefined) {
		res.status(400).send({'message' : 'Event not specified.'});
		return;
	}
	if(!req.isAuthenticated()) {
		res.status(401).send({'message' : 'User is not logged in.'});
	} else if(req.hasAuthorization(req.user, ['recruiter', 'admin'])) {
		var id = req.user._id;
		var query = User.findOne({'_id' : id});
		query.select('attendeeList');
		query.populate('attendeeList.user_id', 'displayName email');
		query.exec(function(err, result) {
			if(err) {
				res.status(400).send(err);
			} else if(!result || !result.attendeeList.length) {
				res.status(400).json({'message' : 'User not found or nobody the user invited has signed up to attend yet.'});
			} else {
				var attendeeList = [], j=0;
				for(var i=0; i<result.attendeeList.length; i++) {
					if(result.attendeeList[i].event_id.toString() === req.body.event_id.toString()) {
						attendeeList[j] =result.attendeeList[i];
						j++;
					}
				}
				res.status(200).send(attendeeList);
			}
		});
	} else {
		res.status(401).send({'message' : 'User does not have permission.'});
	}
};

/*
* Get the invitee list of the currently logged in recruiter for the event specified.
*/
exports.getRecruiterInvitees = function(req, res) {
	if(req.body.event_id === undefined) {
		res.status(400).send({'message' : 'Event not specified.'});
		return;
	}
	if(!req.isAuthenticated()) {
		res.status(401).send({'message' : 'User is not logged in.'});
	} else if(req.hasAuthorization(req.user, ['recruiter', 'admin'])) {
		var id = req.user._id;
		var query = User.findOne({'_id' : id});
		query.select('inviteeList');
		query.populate('inviteeList.user_id', 'displayName email');
		query.exec(function(err, result) {
			if(err) {
				res.status(400).send(err);
			} else if(!result || !result.inviteeList.length) {
				res.status(400).json({'message' : 'User not found or the user has not invited anybody yet.'});
			} else {
				var inviteeList = [], j=0;
				for(var i=0; i<result.inviteeList.length; i++) {
					if(result.inviteeList[i].event_id.toString() === req.body.event_id.toString()) {
						inviteeList[j] =result.inviteeList[i];
						j++;
					}
				}
				res.status(200).send(inviteeList);
			}
		});
	} else {
		res.status(401).send({'message' : 'User does not have permission.'});
	}
};

/*
* Get the almost list of the currently logged in recruiter for the event specified.
*/
exports.getRecruiterAlmosts = function(req, res) {
	if(req.body.event_id === undefined) {
		res.status(400).send({'message' : 'Event not specified.'});
		return;
	}
	if(!req.isAuthenticated()) {
		res.status(401).send({'message' : 'User is not logged in.'});
	} else if(req.hasAuthorization(req.user, ['recruiter', 'admin'])) {
		var id = req.user._id;
		var query = User.findOne({'_id' : id});
		query.select('almostList');
		query.populate('almostList.user_id', 'displayName email');
		query.exec(function(err, result) {
			if(err) {
				res.status(400).send(err);
			} else if(!result || !result.almostList.length) {
				res.status(400).json({'message' : 'User not found or the user has not invited anybody yet.'});
			} else {
				var almostList = [], j=0;
				for(var i=0; i<result.almostList.length; i++) {
					if(result.almostList[i].event_id.toString() === req.body.event_id.toString()) {
						almostList[j] =result.almostList[i];
						j++;
					}
				}
				res.status(200).send(almostList);
			}
		});
	} else {
		res.status(401).send({'message' : 'User does not have permission.'});
	}
};

/*
* Retrieve the list of all people who are signed up to attend the event.
*/
exports.getAttendees = function(req, res) {
	if(req.body.event_id === undefined) {
		res.status(400).send({'message' : 'Event not specified.'});
		return;
	}
	if(!req.isAuthenticated()) {
		res.status(401).send({'message' : 'User is not logged in.'});
	} else if(req.hasAuthorization(req.user, ['recruiter', 'admin'])) {
		var query = User.find({'roles' : 'recruiter', 'status.event_id' : req.body.event_id, 'status.recruiter' : true});
		/*query.elemMatch('status', function(elem) {
			elem.where('event_id', req.body.event_id)
			elem.where('recruiter', true);
		});*/
		/*query.$where(function() {

		});*/
		query.select('fName lName attendeeList');
		query.populate('attendeeList.user_id', 'displayName organization');
		query.exec(function(err, result) {
			if(err) {
				res.status(400).send(err);
			} else if(!result || !result.length) {
				res.status(400).json({'message' : 'Nobody is attending yet.', 'result' : result});
			} else {
				for(var i=0; i<result.length; i++) {
					result[i].toObject();
					result[i].attendeeList = searchByEvent(req.body.event_id, result[i].attendeeList);
				}
				res.status(200).send(result);
			}
		});
	} else {
		res.status(401).send({'message' : 'User does not have permission.'});
	}
};

/*
* Retrieve the list of all people who are invited to attend the specified event.
*/
exports.getInvitees = function(req, res) {
	if(req.body.event_id === undefined) {
		res.status(400).send({'message' : 'Event not specified.'});
		return;
	}
	if(!req.isAuthenticated()) {
		res.status(401).send({'message' : 'User is not logged in.'});
	} else if(req.hasAuthorization(req.user, ['recruiter', 'admin'])) {
		var query = User.find({'roles' : 'recruiter', 'status.event_id' : req.body.event_id, 'status.recruiter' : true});
		query.select('inviteeList displayName');
		query.populate('inviteeList.user_id', 'displayName');
		query.exec(function (err, result) {
			if(err) {
				res.status(400).send(err);
			} else if(!result || !result.length) {
				res.status(400).json({'message' : 'Nobody is invited yet.'});
			} else {
				for(var i=0; i<result.length; i++) {
					result[i].toObject();
					result[i].inviteeList = searchByEvent(req.body.event_id, result[i].inviteeList);
				}
				res.status(200).send(result);
			}
		});
	} else {
		res.status(401).send({'message' : 'User does not have permission.'});	
	}
};

/*Send the information that will be displayed in the first tab of the leaderboard.  This
will include the recruiter's name, rank, and the number of people invited and attendding.*/
exports.getRecruiterInfo = function(req, res) {
	var id = req.user._id;
	var query = User.findOne({'_id' : id});
	query.select('fName lName rank attendeeList inviteeList');
	query.exec(function (err, result) {
		if(err) {
			res.status(400).send(err);
		} else if(!result || !result.length) {
			res.status(400).json({'message' : 'User not found!'});
		} else {
			result.attending = result.attendeeList.length;
			result.invited = result.inviteeList.length;

			//Delete lists, no need to send them since we have the count.
			delete result.attendeeList;
			delete result.inviteeList;

			res.status(200).send(result);
		}
	});
};

/*
* This method returns any and all templates saved for this user.
* If no templates are found, returns a JSON object with field message
* set as 'No templates have been saved.'  If there was an error, the
* error is returned.  If there were no errors, the result is returned.
*/
exports.getUserTemplates = function(req, res) {
	if(!req.isAuthenticated())
		res.status(401).send({'message' : 'User is not logged in.'});
	else {
		var id = req.user._id;
		var query = User.findOne({'_id' : id});
		query.select('templates');
		query.exec(function(err, result) {
			if(err) {
				res.status(400).send(err);
			} else if(!result || !result.length) {
				res.status(400).json({'message' : 'No templates have been saved.'});
			} else {
				res.status(200).send(result);
			}
		});
	}
};

/*
* This method returns the email address for the user currently signed in.
*/
exports.getEmail = function(req, res) {
	if(!req.isAuthenticated())
		res.status(401).send({'message' : 'User is not logged in.'});
	else {
		var id = req.user._id;
		var query = User.findOne({'_id' : id});
		query.select('email');
		query.exec(function(err, result) {
			if(err) {
				res.status(400).send(err);
			} else if(!result) {
				res.status(400).json({'message' : 'The impossible has occurred: no email found for user.'});
			} else {
				res.status(200).send({'email' : result.email});
			}
		});
	}
};

/*
* This method sends an invitation to the invitee through the recruiter's email address.  If the invitee has not been invited before, the invitee is added to our database.  If the
* invitee has been invited before, but is not attending, this invitee is simply added to the recruiter's inviteeList.  In either of these cases, the recruiter's rank may have changed
* so their rank for this event must be updated.  However, if the user has been invited and is already attending the specified event, the invitee will be added to their almostList.
* Since the almostList does not affect the recruiter's rank, their rank does not have to be updated.
*
* TODO: A much more efficient method for updating this information, especially the recruiter's rank, should be researched and used when time permits.
*/
exports.sendInvitation = function(req, res) {
	if(req.body.fName === undefined || req.body.lName === undefined || req.body.email === undefined || req.body.event_id) {
		res.status(400).send({'message' : ''});
		return;
	}

	if(!req.isAuthenticated()) {
		res.status(401).send({'message' : 'User is not logged in.'});
	} else if(req.hasAuthorization(req.user, ['recruiter', 'admin'])) {
		var smtpTransport = nodemailer.createTransport(config.mailer.options);
		var mailOptions = {
			to: req.body.email,
			from: req.user.email,
			replyTo: req.user.email,
			subject: "You're Invied to frank!",
			html: emailHTML
		};

		smtpTransport.sendMail(mailOptions, function(err) {
			if (!err) {
				var query = User.findOne({'_id' : req.user._id});
				query.exec(function(err, recruiter) {
					if(err) {
						res.status(400).send('message' : 'User is not logged in or does not have permissions.');
					} else if(!recruiter) {
						res.status(400).send({'message' : 'Recruiter not found.'});
					} else {
						var query2 = User.findOne({'email' : req.body.email, 'status.event_id' : req.body.event_id, 'status.attending' : true});
						query2.exec(function(err, invitee) {
							if(err) {
								res.status(400).send({'message' : 'Invitation sent, but could not be added to Leaderboard.  Please contact frank with invitee information to get credit for this invitation.'});
							
							//Either the specified user is not attending the event yet or has not even been invited.
							} else if(!invitee) {
								async.waterfall([
									function(callback) {
										User.findOne({'email' : req.body.email}, function(err, result) {
											if(err) {
												callback("Invitation sent, but could not be added to Leaderboard.  Please contact frank with invitee information to get credit for this invitation.", null);//res.status(400).send({'message' : 'Invitation sent, but could not be added to Leaderboard.  Please contact frank with invitee information to get credit for this invitation.'});
											} else if(!result) {
												//Invitee is not in the db yet.  Add the invitee to the db and send the new User object to the next function.
												newUser = new User({
													fName : req.body.fName,
													lName : req.body.lName,
													email : req.body.email,
													roles : ['attendee'],
													login_enabled : false,
													displayName : req.body.lName + ', ' + req.body.fName,
													password : tempPass()
												});

												newUser.save(function(err, result2) {
													callback(err, result2);
												});
											} else {
												//Invitee is already in the db, send the User object to the next function to be added to the recruiter's inviteeList.
												callback(null, result);
											}
										});
									},
									function(invitee, callback) {
										//Add the invitee to the recruiter's inviteeList.
										recruiter.inviteeList.push({'event_id' : req.body.event_id, 'user_id' : invitee._id});
										recruiter.save(function(err, result) {
											if(err) {
												callback("Invitation sent, but could not be added to Leaderboard.  Please contact frank with invitee information to get credit for this invitation.", null);
											} else {
												callback(null, 1);
											}
										}
									},
									function(callback) {
										updateRanks(req.body.event_id);

										//Since it is unlikely that an error will occur in the function above and if there were an error the user could not (and probably would not) do anything about it, we can 'assume' no error will occur and continue.
										//For debugging, we may want to add a few temporary methods to send errors to the frontend.
										callback(null, 1);
									}
								], function(err, results) {
									if(err) {
										res.status(400).send({'message' : err});
									} else {
										res.status(200).send({message: 'Invitation has been sent to ' + req.body.email + '!'});
									}
								});
							
							//This user has already been invited and is attending this event.
							} else {
								recruiter.almostList.push({'event_id' : req.body.event_id, 'user_id' : invitee._id});
								recruiter.save(function(err, result) {
									//almostList does not affect rank and the user has been created, just return.
									res.status(200).send({message: 'Invitation has been sent to ' + req.body.email + '!'});
								});
							}
						});
					}
				});
			} else {
				res.status(400).send('message' : 'Invitation not sent.  Please try again.');
			}
		});

	} else {
		res.status(401).send({'message' : 'User does not have permission.'});
	}
};
