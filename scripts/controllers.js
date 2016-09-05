/* global angular */

'use strict';

/* Controllers */
var appControllers = angular.module('appControllers', ['iroad-relation-modal'])

    .controller('MainController', function (NgTableParams, iRoadModal, $scope, $uibModal, $log, $interval, leafletData) {
        //$scope.offenceEvent = iRoadModal("Offence Event");
        var latitude = -6.3690;
        var longitude = 34.8888;
        angular.extend($scope, {
            center: {
                lat: latitude,
                lng: longitude,
                zoom: 3
            }, events: {
                map: {
                    enable: ['zoomstart', 'drag', 'click', 'mousemove'],
                    logic: 'emit'
                }
            }
        });
        $scope.markers = {};
        $scope.programName = "Community Police";
        $scope.getCommunityPolice = function () {
            iRoadModal.getAll($scope.programName, $scope.params).then(function (results) {
                results.forEach(function (event) {
                    if (!$scope.markers[event.event]) {
                        $scope.markers[event.event] = {
                            lat: event.coordinate.latitude,
                            lng: event.coordinate.longitude,
                            event: event,
                            interval: $interval((function (eventId) {
                                return function () {
                                    if ($scope.markers[eventId].opacity == 0) {
                                        $scope.markers[eventId].opacity = 1;
                                    } else {
                                        $scope.markers[eventId].opacity = 0;
                                    }
                                }
                            })(event.event), 1000)
                        }
                    }
                })
            })
        }
        $scope.addFacility = function () {
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'views/addFacility.html',
                controller: 'FacilityController',
                size: "md"
            });

            modalInstance.result.then(function (resultItem) {

            }, function () {
                $log.info('Modal dismissed at: ' + new Date());
            });
        }
        $scope.$on('leafletDirectiveMarker.click', function (event, marker) {
            $interval.cancel(marker.model.interval);
            $scope.showDetails(marker.model.event, marker);
        });

        dhis2.loadData = function () {
            iRoadModal.getProgramByName($scope.programName).then(function (program) {
                $scope.program = program;
                $interval($scope.getCommunityPolice, 1000);
            });
        };

        $scope.showCommunityReports = function () {
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'views/listReports.html',
                controller: 'ListController',
                size: "md",
                resolve: {
                    program: function () {
                        return $scope.program;
                    }
                }
            });

            modalInstance.result.then(function (resultItem) {
            }, function () {
                $log.info('Modal dismissed at: ' + new Date());
            });
        }
        $scope.showDetails = function (event) {
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'views/details.html',
                controller: 'DetailController',
                size: "md",
                resolve: {
                    event: function () {
                        return event;
                    },
                    program: function () {
                        return $scope.program;
                    }
                }
            });

            modalInstance.result.then(function (event) {
                iRoadModal.setRelations(event).then(function () {

                });
            }, function () {
                iRoadModal.setRelations(event).then(function () {

                });
                $log.info('Modal dismissed at: ' + new Date());
            });
        };
    })
    .controller('ListController', function (iRoadModal, NgTableParams, $scope, $uibModalInstance, program, TableService, $uibModal) {
        $scope.loading = true;
        $scope.programName = "Community Police";
        $scope.tableParams = new NgTableParams();
        $scope.getCommunityPolice = function () {
            iRoadModal.getAll($scope.programName).then(function (results) {
                $scope.loading = false;
                $scope.tableParams.settings({
                    dataset: results
                });
                iRoadModal.getProgramByName($scope.programName).then(function (program) {
                    $scope.program = program;
                    $scope.tableCols = TableService.createColumns(program.programStages[0].programStageDataElements);
                })
            })
        }
        $scope.getCommunityPolice();
        $scope.program = program;
        $scope.ok = function () {
            $uibModalInstance.close({});
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
        $scope.showDetails = function (event) {
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'views/details.html',
                controller: 'DetailController',
                size: "md",
                resolve: {
                    event: function () {
                        return event;
                    },
                    program: function () {
                        return $scope.program;
                    }
                }
            });

            modalInstance.result.then(function (event) {

            }, function () {
                $log.info('Modal dismissed at: ' + new Date());
            });
        };
    })
    .controller('DetailController', function (iRoadModal, $scope, $uibModalInstance, program, event) {
        $scope.loading = true;
        iRoadModal.getRelations(event).then(function (newEvent) {
            $scope.event = newEvent;
            $scope.loading = false;
        });
        $scope.program = program;
        $scope.ok = function () {
            $uibModalInstance.close({});
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    })
    .controller('FacilityController', function (iRoadModal, $scope, $uibModalInstance, $http,toaster) {
        $scope.data = {
            organisationUnit: {
                organisationUnitGroups: [{}]
            }
        }
        $scope.date = {
            dateOptions: {
                dateDisabled: false,
                formatYear: 'yy',
                maxDate: new Date(2020, 5, 22),
                minDate: new Date(),
                startingDay: 1
            },
            opened: false,
            altInputFormats: ['M!/d!/yyyy'],
            open: function () {
                this.opened = true;
            }
        }
        $http.get("/" + dhis2.settings.baseUrl + "/api/organisationUnitGroups.json?fields=id,name").then(function (results) {
            console.log(results);
            $scope.data.organisationUnitGroups = results.data.organisationUnitGroups;
        })
        $scope.save = function () {
            $scope.loading = true;
            $scope.data.organisationUnit.shortName = $scope.data.organisationUnit.name;
            $http.post("/" + dhis2.settings.baseUrl + "/api/organisationUnits", $scope.data.organisationUnit).then(function (result) {
                console.log(result);
                if (result.data.status == "OK" && result.data.response.importCount.imported == 1) {
                    $http.post('../../../api/organisationUnitGroups/' + $scope.data.organisationUnit.organisationUnitGroups[0].id + '/organisationUnits/' + result.data.response.lastImported + '.json', $scope.data.organisationUnit).success(function (data, status, headers, config) {
                        toaster.pop("success","Successful","Facility saved succefully.")
                        $scope.loading = false;
                        $uibModalInstance.close({});
                    }).error(function (data) {
                        toaster.pop("error","Error","Failed to save the Facility. Please try again.")
                    });
                }else{
                    toaster.pop("error","Error","Failed to save the Facility. Please try again.")
                    $scope.loading = false;
                }
            })
        }
        /*$scope.loading = true;
         iRoadModal.getRelations(event).then(function(newEvent){
         $scope.event = newEvent;
         $scope.loading = false;
         });
         $scope.program = program;
         $scope.ok = function () {
         $uibModalInstance.close({});
         };

         $scope.cancel = function () {
         $uibModalInstance.dismiss('cancel');
         };*/
    })
