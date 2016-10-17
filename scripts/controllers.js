/* global angular */

'use strict';

/* Controllers */
var appControllers = angular.module('appControllers', ['iroad-relation-modal'])

    .controller('MainController', function (NgTableParams, iRoadModal, $scope, $uibModal, $log, $interval, $http, DHIS2URL, toaster) {
        //$scope.offenceEvent = iRoadModal("Offence Event");
        var latitude = -6.3690;
        var longitude = 34.8888;
        angular.extend($scope, {
            center: {
                lat: latitude,
                lng: longitude,
                zoom: 6
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
            iRoadModal.getAll($scope.programName,undefined, {"startDate":(new Date()).toISOString(),"endDate":(new Date()).toISOString()}).then(function (results) {
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
            if ($scope.data.selectedOrgUnit) {
                $uibModal.open({
                    animation: $scope.animationsEnabled,
                    templateUrl: 'views/addFacility.html',
                    controller: 'FacilityController',
                    size: "md",
                    resolve: {
                        organisationUnit: function () {
                            return $scope.data.selectedOrgUnit;
                        }
                    }

                }).result.then(function (organisationUnitId) {
                    alert(organisationUnitId);
                    $http.get("/" + dhis2.settings.baseUrl + "/api/organisationUnits/"+ organisationUnitId +".json?fields=id,name,level,organisationUnitGroups,coordinates").then(function (results) {
                        $scope.data.organisationUnitGroups = results.data.organisationUnitGroups;
                        $scope.addFacilityMarker(results.data);
                    })
                }, function () {
                    $log.info('Modal dismissed at: ' + new Date());
                });
            } else {
                toaster.pop("warning", "Organisation Unit Not Selected.", "Please Select Organisation Unit.")
            }

        }
        $scope.$on('leafletDirectiveMarker.click', function (event, marker) {
            $interval.cancel(marker.model.interval);
            if(marker.model.event){
                $scope.showDetails(marker.model.event, marker);
            }else{
                $scope.showDetails(marker.model.orgUnit, marker);
            }
        });

        $scope.$watch('data.selectedOrgUnit', function (selectedOrgUnit, marker) {
            if (selectedOrgUnit) {
                for(var key in $scope.markers){
                    if(key.indexOf("facility") > -1){
                        $scope.markers[key] = undefined;
                    }
                }
                $http.get(DHIS2URL + "api/organisationUnits.json?filter=path:like:" + selectedOrgUnit.id + "&filter=organisationUnitGroups.name:eq:Hospitals&fields=id,name,level,organisationUnitGroups,coordinates")
                    .then(function (results) {
                        results.data.organisationUnits.forEach(function (organisationUnit) {
                            $scope.addFacilityMarker(organisationUnit);
                        })
                    }, function (error) {
                        toaster.pop("error", "Network Error.", "Please try again by reloading.")
                    });
            }
        });
        $scope.addFacilityMarker = function(organisationUnit){
            if(organisationUnit.coordinates){
                var coords = eval(organisationUnit.coordinates)
                if (!$scope.markers["facility" + organisationUnit.id]) {
                    $scope.markers["facility" + organisationUnit.id] = {
                        icon:{
                            iconUrl: 'http://image.flaticon.com/icons/svg/69/69770.svg',
                            iconSize:     [38, 95], // size of the icon
                            shadowSize:   [50, 64], // size of the shadow
                            iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
                            shadowAnchor: [4, 62],  // the same for the shadow
                            popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
                        },
                        lat: coords[0],
                        lng: coords[1],
                        orgUnit:organisationUnit
                    }
                }
            }
        }

        $scope.data = {
            config: {},
            selectedOrgUnit: undefined
        }
        iRoadModal.getUser().then(function (results) {
            var orgUnitIds = [];
            results.organisationUnits.forEach(function (orgUnit) {
                orgUnitIds.push(orgUnit.id);
            });
            $http.get(DHIS2URL + "api/organisationUnits.json?filter=id:in:[" + orgUnitIds + "]&fields=id,name,level,children[id,name,level,children[id,name,level,children[id,name,level,children[id,name,level,children]]]]")
                .then(function (results) {
                    $scope.data.organisationUnits = results.data.organisationUnits;
                }, function (error) {
                    toaster.pop("error", "Network Error.", "Please try again by reloading.")
                });
        })
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
            if(event.event){
                $scope.markers[event.event].opacity = 1;
            }
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
        if(event.event){
            $scope.loading = true;
            iRoadModal.getRelations(event).then(function (newEvent) {
                $scope.event = newEvent;
                $scope.loading = false;
            });
        }else{
            $scope.organisationUnit = event;
        }

        $scope.program = program;
        $scope.ok = function () {
            $uibModalInstance.close({});
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    })
    .controller('FacilityController', function (iRoadModal, $scope, $uibModalInstance, $http, toaster, organisationUnit) {
        $scope.data = {
            coordinates:{},
            organisationUnit: {
                coordinates:"",
                level:organisationUnit.level + 1,
                parent: {id: organisationUnit.id},
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
            $scope.data.organisationUnit.coordinates = "[" + $scope.data.coordinates.latitude+ "," + $scope.data.coordinates.longitude + "]";
            $scope.data.organisationUnit.shortName = $scope.data.organisationUnit.name;
            console.log($scope.data);
            $http.post("/" + dhis2.settings.baseUrl + "/api/organisationUnits", $scope.data.organisationUnit).then(function (result) {
                if (result.data.status == "OK" && result.data.response.importCount.imported == 1) {
                    $http.post('../../../api/organisationUnitGroups/' + $scope.data.organisationUnit.organisationUnitGroups[0].id + '/organisationUnits/' + result.data.response.lastImported + '.json', $scope.data.organisationUnit).success(function (data, status, headers, config) {
                        toaster.pop("success", "Successful", "Facility saved succefully.")
                        $scope.loading = false;
                        $uibModalInstance.close(result.data.response.lastImported);
                    }).error(function (data) {
                        toaster.pop("error", "Error", "Failed to save the Facility. Please try again.")
                    });
                } else {
                    toaster.pop("error", "Error", "Failed to save the Facility. Please try again.")
                    $scope.loading = false;
                }
            })
        }
        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    })
