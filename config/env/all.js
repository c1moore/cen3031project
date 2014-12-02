'use strict';

module.exports = {
	app: {
		title: 'frank Recruiter System',
		description: 'Recruiter system developed for frank for its annual invitation-only events.',
		keywords: 'Recruiter system, frank, attendee chatroom, recruiters, invitation-only events'
	},
	port: process.env.PORT || 3000,
	templateEngine: 'swig',
	sessionSecret: 'MEAN',
	sessionCollection: 'sessions',
	assets: {
		lib: {
			css: [
				'public/lib/bootstrap/dist/css/bootstrap.css',
				'public/lib/bootstrap/dist/css/bootstrap-theme.css',
				'public/lib/ng-table/ng-table.css',
				'public/lib/font-awesome/css/font-awesome.min.css',
			],
			js: [
				'public/lib/jquery/dist/jquery.min.js',
				'public/lib/angular/angular.js',
				'public/lib/angular-resource/angular-resource.js', 
				'public/lib/angular-cookies/angular-cookies.js', 
				'public/lib/angular-animate/angular-animate.js', 
				'public/lib/angular-touch/angular-touch.js', 
				'public/lib/angular-sanitize/angular-sanitize.js', 
				'public/lib/angular-ui-router/release/angular-ui-router.js',
				'public/lib/angular-ui-utils/ui-utils.js',
				'public/lib/angular-bootstrap/ui-bootstrap-tpls.js',
				'public/lib/ng-table/ng-table.js',
				'public/lib/lodash/dist/lodash.js',
				'public/lib/jquery-ui/jquery-ui.min.js',
				'public/lib/angularjs-dropdown-multiselect/src/angularjs-dropdown-multiselect.js',
				'public/lib/textAngular/src/textAngular-sanitize.js',
				'public/lib/textAngular/src/textAngular.js',
				'public/lib/textAngular/src/textAngularSetup.js',
				'public/lib/ng-file-upload/angular-file-upload-shim.js',
				'public/lib/ng-file-upload/angular-file-upload.js'
			]
		},
		css: [
			'public/modules/**/css/*.css'
		],
		js: [
			'public/config.js',
			'public/application.js',
			'public/modules/*/*.js',
			'public/modules/*/*[!tests]*/*.js'
		],
		tests: [
			'public/lib/angular-mocks/angular-mocks.js',
			'public/modules/*/tests/*.js'
		]
	}
};