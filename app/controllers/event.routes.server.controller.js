'use strict';

/**
 * Module dependencies.
 */

var errorHandler = require('./errors'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Event = mongoose.model('Event');

var canViewEvent = function(user,eventID,hasAuthorization) {
	var statusArray = user.status;
	for (var i = 0; i<statusArray.length;i++) {
		if(statusArray[i].event_id==eventID) {
			return true;
		}
	}
	if (hasAuthorization(user,['admin'])) return true;
	return false;
};

//NOTE: Leaderboard in User has more routes to get events just for recruiters, events being recruited for
//		etc. This event getter is just the tip of the iceberg
exports.getMyEvents = function(req, res) {
	if (!req.isAuthenticated()) { //Check if the user is authenticated
		res.status(401).json({message: "You are not logged in"});
		return;
	}
	var id = req.user._id;
	var query = User.findOne({_id: id});
	var user;
	//Retrieve user events on behalf of the authenticated user
	query.exec(function(err,result) {
		user = result;
		if (err) {res.status(400).send(err);return;}
		else if (!user) {res.status(400).json({message: "No user found!"});return;}
		var myEvents = [];
		var statusArray = user.status;
		for (var i = 0; i<statusArray.length;i++)
			myEvents.push(statusArray[i].event_id);
		res.status(200).json({events: myEvents});
	});
};

exports.getAllEvents = function(req, res) {
	if (!req.isAuthenticated()) { //Must be logged in
		res.status(401).json({message: "You are not logged in"});
		return;
	} else if (!req.hasAuthorization(req.user,["admin"])) { //Only admins can view all events
		res.status(401).json({message: "Access Denied. This incident will be reported."});
		return;
	}
	//Find and return all events in the collection
	var query = Event.find({});
	query.exec(function(err,result) {
		if (err) {res.status(400).send(err);return;}
		else if (!result) {res.status(400).json({message: "No events found?!"});return;}
		res.status(200).json(result);
	});
};

exports.getStartDate = function(req, res) {
	if (!req.isAuthenticated()) { //Check authorization
		res.status(401).json({message: "You are not logged in"});
		return;
	//Must have permission to make requests on this ID
	} else if (!canViewEvent(req.user,req.body.eventID,req.hasAuthorization)) {
		res.status(401).json({message: "You do not have permission to request this ID"});
		return;
	}
	//Retrieve the requested field
	var id = req.session.id;
	var eventID = req.body.eventID;
	var query = Event.findOne({_id: eventID});
	var theResult;
	query.exec(function(err,result) {
		theResult = result;
		if (err) res.status(400).send(err);
		else if (!theResult) res.status(400).json({message: "No event with that id!"});
		else res.status(200).json({start_date: theResult.start_date});
	});
};

exports.getEndDate = function(req, res) {
	if (!req.isAuthenticated()) { //Must be logged in
		res.status(401).json({message: "You are not logged in"});
		return;
	//Must have permission to make requests on this ID
	} else if (!canViewEvent(req.user,req.body.eventID,req.hasAuthorization)) {
		res.status(401).json({message: "You do not have permission to request this ID"});
		return;
	}
	var id = req.session.id;
	var eventID = req.body.eventID;
	var query = Event.findOne({_id: eventID});
	var theResult;
	query.exec(function(err,result) {
		theResult = result;
		if (err) res.status(400).send(err);
		else if (!theResult) res.status(400).json({message: "No end date!"});
		else res.status(200).json({end_date: theResult.end_date});
	});
};

exports.getLocation = function(req, res) {
	if (!req.isAuthenticated()) { //Must be logged in
		res.status(401).json({message: "You are not logged in"});
		return;
	//Must have permission to make requests on this ID
	} else if (!canViewEvent(req.user,req.body.eventID,req.hasAuthorization)) {
		res.status(401).json({message: "You do not have permission to request this ID"});
		return;
	}
	var id = req.user._id;
	var eventID = req.body.eventID;
	var query = Event.findOne({_id: eventID});
	var theResult;
	query.exec(function(err,result) {
		theResult = result;
		if (err) res.status(400).send(err);
		else if (!theResult) res.status(400).json({message: "No location!"});
		else res.status(200).json({location: theResult.location});
	});
};

exports.getEventObj = function(req, res) {
	if (!req.isAuthenticated()) { //Must be logged in
		res.status(401).json({message: "You are not logged in"});
		return;
	//Must have permission to make requests on this ID
	} else if (!canViewEvent(req.user,req.body.eventID,req.hasAuthorization)) {
		res.status(401).json({message: "You do not have permission to request this ID"});
		return;
	}
	var id = req.session.id;
	var eventID = req.body.eventID;
	var query = Event.findOne({_id: eventID});
	var theResult;
	query.exec(function(err,result) {
		theResult = result;
		if (err) res.status(400).send(err);
		else if (!theResult) res.status(400).json({message: "No such object!"});
		else res.status(200).json(theResult);
	});
};

exports.getSchedule = function(req, res) {
	if (!req.isAuthenticated()) { //Must be logged in
		res.status(401).json({message: "You are not logged in"});
		return;
	//Must have permission to make requests on this ID
	} else if (!canViewEvent(req.user,req.body.eventID,req.hasAuthorization)) {
		res.status(401).json({message: "You do not have permission to request this ID"});
		return;
	}
	var id = req.session.id;
	var eventID = req.body.eventID;
	var query = Event.findOne({_id: eventID});
	var theResult;
	query.exec(function(err,result) {
		theResult = result;
		if (err) res.status(400).send(err);
		else if (!theResult) res.status(400).json({message: "No schedule!"});
		else res.status(200).json({schedule: theResult.schedule});
	});
};

exports.getName = function(req, res) {
	if (!req.isAuthenticated()) { //Must be logged in
		res.status(401).json({message: "You are not logged in"});
		return;
	//Must have permission to make requests on this ID
	} else if (!canViewEvent(req.user,req.body.eventID,req.hasAuthorization)) {
		res.status(401).json({message: "You do not have permission to request this ID"});
		return;
	}
	var id = req.session.id;
	var eventID = req.body.eventID;
	var query = Event.findOne({_id: eventID});
	var theResult;
	query.exec(function(err,result) {
		theResult = result;
		if (err) res.status(400).send(err);
		else if (!theResult) res.status(400).json({message: "No name!"});
		else res.status(200).json({name: theResult.name});
	});
};