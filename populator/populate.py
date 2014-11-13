#!/usr/bin/python3

#Program to prepopulate mongo for integration testing and other purposes by James

from User import User
from Candidate import Candidate
from Attendee import Attendee
from Event import Event
from Util import resetMongo

import random, time

required = "You must specify an interger. This field is required."

def welcome():
  msg = ("---Welcome to the populator script!---\n" +
	"This program will populate the database for testing and demonstration purposes.\n")
  print(msg)

def getRandomSeed():
  read = input("Random seed value (any number, optional, allows repeatability): ")
  if not read:
    return time.time()
  else:
    return int(read)

def getNumAttendees():
  while True:
    try:
      numAttendees = int(input("How many attendees will there be?: "))
    except ValueError:
      print(required)
    else:
      return numAttendees

def getNumRecruiters():
  while True:
    try:
      numRecruiters = int(input("How many recruiters will there be?: "))
    except ValueError:
      print(required)
    else:
      return numRecruiters

def getNumAdmins():
  while True:
    try:
      numAdmins = int(input("How many admins will there be?: "))
    except ValueError:
      print(required)
    else:
      return numAdmins

def getNumCandidates():
  while True:
    try:
      numCandidates = int(input("How many candidates will there be?: "))
    except ValueError:
      print(required)
    else:
      return numCandidates

def getAdminsUnionRecruiters(numRecruiters,numAdmins):
  while True:
    try:
      unions = int(input(("Of the {} recruiters, how many of them should also be admins? \n" + 
		"(up to {}, or -1 for don't care): ").format(numRecruiters,max(numAdmins,numRecruiters))))
    except ValueError:
      print(required)
    else:
      return unions

def getAttendeesUnionRecruiters(numRecruiters,numAttendees):
  while True:
    try:
      union = int(input(("Of the {} recruiters, how many of them should also be attendees? \n" + 
		"(up to {}, or -1 for don't care): ").format(numRecruiters,max(numRecruiters,numAttendees))))
    except ValueError:
      print(required)
    else:
      return union

def getNumEvents():
  while True:
    try:
      numEvents = int(input("How many events will there be?: "))
    except ValueError:
      print(required)
    else:
      return numEvents

def getMaxEventsPerRecruiter():
  while True:
    try:
      maxEvents = int(input("How many events (maximum) does a recruiter recruit for?: "))
    except ValueError:
      print(required)
    else:
      return maxEvents

def getNumInvitesPerRecruiter():
  while True:
    try:
      numInvites = int(input("How many invites should each recruiter send?: "))
    except ValueError:
      print(required)
    else:
      return numInvites

def getNumEventsPerCandidate():
  while True:
    try:
      numEvents = int(input("How many events should each candidate apply for?: "))
    except ValueError:
      print(required)
    else:
      return numEvents

def main():
  welcome()
  random.seed(a=getRandomSeed())
  numAttendees = getNumAttendees()
  numRecruiters = getNumRecruiters()
  numAdmins = getNumAdmins()
  numCandidates = getNumCandidates()
  numEvents = getNumEvents()
  adminsUnionRecruiters = getAdminsUnionRecruiters(numRecruiters,numAdmins)
  attendeesUnionRecruiters(numRecruiters,numAdmins)
  maxEventsPerRecruiter = getMaxEventsPerRecruiter()
  numInvitesPerRecruiter = getNumInvitesPerRecruiter()
  numEventsPerCandidate = getNumEventsPerCandidate()
  if adminsUnionRecruiters==-1:
    adminsUnionRecruiters=random.randint(0,max(numAdmins,numRecruiters))
  if attendeesUnionRecruiters==-1:
    attendeesUnionRecruiters=random.randint(0,max(numRecruiters,numAttendees))
  print("Generating objects...")
  time.sleep(3) #Take a deep breath!
  recruiters = set()
  attendees = set()
  admins = set()
  candidates = set()
  events = set()
  #Make events
  for i in range(numEvents):
    event = Event()
    event.randomize()
    event.save()
    events.add(event)
  #Make recruiters
  for i in range(numRecruiters):
    newUser = User()
    newUser.randomize()
    newUser.roles = ['recruiter']
    for i in range(random.randint(0,maxEventsPerRecruiter)): #Make them recruit for some events
      newUser.recruitFor(random.choice(events))
    recruiters.add(newUser)
    newUser.save()
  count = 0
  #Make some recruiters attendees
  while count<attendeesUnionRecruiters:
    recruiter = random.choice(recruiters)
    if recruiter.roles.contains('attendee'):
      continue
    recruiter.roles.append('attendee')
    attendees.add(recruiter)
    count += 1
  count = 0
  #Make some recruiters admins
  while count<adminsUnionRecruiters:
    recruiter = random.choice(recruiters)
    if recruiter.roles.contains('admin'):
      continue
    recruiter.roles.append('admin')
    admins.add(recruiter)
    count += 1
  count = 0
  #Create the remaining attendees
  while len(attendees)<numAttendees:
    newUser = User()
    newUser.randomize()
    newUser.roles = ['attendee']
    attendees.add(newUser)
  #Create the remaining admins
  while len(admins)<numAdmins:
    newUser = User()
    newUser.randomize()
    newUser.roles = ['admin']
    admins.add(newUser)
  #Create the remaining candidates
  while len(candidates)<numCandidates:
    newUser = Candidate()
    newUser.randomize()
    for i in range(numEventsPerCandidate):
      newUser.addEvent(random.choice(events))
    candidates.add(newUser)
  #Recruiters, invite users who are not me
  for recruiter in recruiters:
    recevents = recruiter.getEvents()
    for i in range(numInvitesPerRecruiter):
      rec_event_id = random.choice(recevents)
      rec_user = random.choice(attendees)
      while rec_user is recruiter:
        rec_user = random.choice(attendees)
      recruiter.invite(rec_user,rec_event_id)
      

if __name__=='__main__':
  main()
