angular.module('leaderboard').controller('LeaderboardController', ['$scope', 'Authentication', '$http',
	function($scope, Authentication) {
		// route will be leaderboard/recuiterInfo

		$scope.data = {
			users: [
				{rank:2 ,username:"User 1", invites:23, attending:10},
				{rank:1 ,username:"User 2", invites:10, attending:10},
				{rank:3 ,username:"User 3", invites:56, attending:13},
				{rank:4 ,username:"User 4", invites:12, attending:4},
				{rank:5 ,username:"User 5", invites:27, attending:17}
			],
			categories: ["Rank","User","Invited","Attending"]
		};

		//number of people to display on a page
		$scope.limitVal = 4;

		$scope.totalVal = $scope.data.users.length;
		$scope.currentPage = 1;
		

		$scope.activeOrder = function(order) {
			return order == $scope.sortBy ? "btn-primary" : "";
		}
	}
]);