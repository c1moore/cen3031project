angular.module('leaderboard').controller('AttendingController', ['$scope', 'Authentication', '$http',
	function($scope, Authentication, $http) {
		// route will be leaderboard/recuiterInfo
		$scope.data = {
			users: [
				{rank:2 ,displayName:"User 1", invites:23, attending:10},
				{rank:1 ,displayName:"User 2", invites:10, attending:10},
				{rank:3 ,displayName:"User 3", invites:56, attending:13},
				{rank:4 ,displayName:"User 4", invites:12, attending:4},
				{rank:5 ,displayName:"User 5", invites:27, attending:17}
			],
			categories: ["Rank","User","Invited","Attending"],
			error: null
		};

		$http.get('/modules/leaderboard/tests/MOCK_DATA.json').success(function(data) {
			$scope.data.users = data;
			$scope.totalVal = $scope.users.length;
		}).error(function(error){
			$scope.data.error = error;
		});

		//number of people to display on a page
		$scope.limitVal = 10;

		$scope.currentPage = 1;

		$scope.activeOrder = function(order) {
			return order == $scope.sortBy ? "btn-primary" : "";
		}
	}
]);