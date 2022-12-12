function createBubbleChart(error, countries, continentNames) {
    var Avg_social_media_time = countries.map(function (country) {
        return +country.Avg_social_media_time;
    });
    var meanAvg_social_media_time = d3.mean(Avg_social_media_time),
        Avg_social_media_timeExtent = d3.extent(Avg_social_media_time),
        Avg_social_media_timeScaleX,
        Avg_social_media_timeScaleY;

    var continents = d3.set(countries.map(function (country) {
        return country.ContinentCode;
    }));
    var continentColorScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(continents.values());

    var width = 1200,
        height = 800;
    var svg,
        circles,
        circleSize = {min: 2, max: 50};
    var circleRadiusScale = d3.scaleSqrt()
        .domain(Avg_social_media_timeExtent)
        .range([circleSize.min, circleSize.max]);

    var forces,
        forceSimulation;

    createSVG();
    toggleContinentKey(!flagFill());
    createCircles();
    createForces();
    createForceSimulation();
    addFlagDefinitions();
    addFillListener();
    addGroupingListeners();

    function createSVG() {
        svg = d3.select("#bubble-chart")
            .append("svg")
            .attr("width", width-50)
            .attr("height", height);
    }

    function toggleContinentKey(showContinentKey) {
        var keyElementWidth = 150,
            keyElementHeight = 30;
        var onScreenYOffset = keyElementHeight * 1.5,
            offScreenYOffset = 100;

        if (d3.select(".continent-key").empty()) {
            createContinentKey();
        }
        var continentKey = d3.select(".continent-key");

        if (showContinentKey) {
            translateContinentKey("translate(0," + (height - onScreenYOffset) + ")");
        } else {
            translateContinentKey("translate(0," + (height + offScreenYOffset) + ")");
        }

        function createContinentKey() {
            var keyWidth = keyElementWidth * continents.values().length;
            var continentKeyScale = d3.scaleBand()
                .domain(continents.values())
                .range([(width - keyWidth) / 2, (width + keyWidth) / 2]);

            svg.append("g")
                .attr("class", "continent-key")
                .attr("transform", "translate(0," + (height + offScreenYOffset) + ")")
                .selectAll("g")
                .data(continents.values())
                .enter()
                .append("g")
                .attr("class", "continent-key-element");

            d3.selectAll("g.continent-key-element")
                .append("rect")
                .attr("width", keyElementWidth)
                .attr("height", keyElementHeight)
                .attr("x", function (d) {
                    return continentKeyScale(d);
                })
                .attr("fill", function (d) {
                    return continentColorScale(d);
                });

            d3.selectAll("g.continent-key-element")
                .append("text")
                .attr("text-anchor", "middle")
                .attr("x", function (d) {
                    return continentKeyScale(d) + keyElementWidth / 2;
                })
                .text(function (d) {
                    return continentNames[d];
                });


            d3.selectAll("g.continent-key-element text")
                .attr("y", function (d) {
                    var textHeight = this.getBBox().height;
                    var unneededTextHeight = 4;
                    return ((keyElementHeight + textHeight) / 2) - unneededTextHeight;
                });
        }

        function translateContinentKey(translation) {
            continentKey
                .transition()
                .duration(500)
                .attr("transform", translation);
        }
    }

    function flagFill() {
        return isChecked("#flags");
    }

    function isChecked(elementID) {
        return d3.select(elementID).property("checked");
    }

    function createCircles() {
        var formatAvg_social_media_time = d3.format(",");
        circles = svg.selectAll("circle")
            .data(countries)
            .enter()
            .append("circle")
            .attr("r", function (d) {
                return circleRadiusScale(d.Avg_social_media_time);
            })
            .on("mouseover", function (d) {
                updateCountryInfo(d);
            })
            .on("mouseout", function (d) {
                updateCountryInfo();
            });
        updateCircles();

        function updateCountryInfo(country) {
            var info = "";
            var mins = "Avg minutes";

            if (country) {
                info = [country.CountryName, ":", formatAvg_social_media_time(country.Avg_social_media_time), mins].join(" ");
            }
            d3.select("#country-info").html(info);
        }
    }

    function updateCircles() {
        circles
            .attr("fill", function (d) {
                return flagFill() ? "url(#" + d.CountryCode + ")" : continentColorScale(d.ContinentCode);
            });
    }

    function createForces() {
        var forceStrength = 0.05;

        forces = {
            combine: createCombineForces(),
            countryCenters: createCountryCenterForces(),
            continent: createContinentForces(),
            Avg_social_media_time: createAvg_social_media_timeForces()
        };

        function createCombineForces() {
            return {
                x: d3.forceX(width / 2).strength(forceStrength),
                y: d3.forceY(height / 2).strength(forceStrength)
            };
        }

        function createCountryCenterForces() {
            var projectionStretchY = 0.25,
                projectionMargin = circleSize.max,
                projection = d3.geoEquirectangular()
                    .scale((width / 2 - projectionMargin) / Math.PI)
                    .translate([width / 2, height * (1 - projectionStretchY) / 2]);

            return {
                x: d3.forceX(function (d) {
                    return projection([d.CenterLongitude, d.CenterLatitude])[0];
                }).strength(forceStrength),
                y: d3.forceY(function (d) {
                    return projection([d.CenterLongitude, d.CenterLatitude])[1] * (1 + projectionStretchY);
                }).strength(forceStrength)
            };
        }

        function createContinentForces() {
            return {
                x: d3.forceX(continentForceX).strength(forceStrength),
                y: d3.forceY(continentForceY).strength(forceStrength)
            };

            function continentForceX(d) {
                if (d.ContinentCode === "EU") {
                    return left(width);
                } else if (d.ContinentCode === "AF") {
                    return left(width);
                } else if (d.ContinentCode === "AS") {
                    return right(width);
                } else if (d.ContinentCode === "NA" || d.ContinentCode === "SA") {
                    return right(width);
                }
                return center(width);
            }

            function continentForceY(d) {
                if (d.ContinentCode === "EU") {
                    return top(height);
                } else if (d.ContinentCode === "AF") {
                    return bottom(height);
                } else if (d.ContinentCode === "AS") {
                    return top(height);
                } else if (d.ContinentCode === "NA" || d.ContinentCode === "SA") {
                    return bottom(height);
                }
                return center(height);
            }

            function left(dimension) {
                return dimension / 4;
            }

            function center(dimension) {
                return dimension / 2;
            }

            function right(dimension) {
                return dimension / 4 * 3;
            }

            function top(dimension) {
                return dimension / 4;
            }

            function bottom(dimension) {
                return dimension / 4 * 3;
            }
        }

        function createAvg_social_media_timeForces() {
            var continentNamesDomain = continents.values().map(function (continentCode) {
                return continentNames[continentCode];
            });
            var scaledAvg_social_media_timeMargin = circleSize.max;

            Avg_social_media_timeScaleX = d3.scaleBand()
                .domain(continentNamesDomain)
                .range([scaledAvg_social_media_timeMargin, width - scaledAvg_social_media_timeMargin * 2]);
            Avg_social_media_timeScaleY = d3.scaleLog()
                .domain(Avg_social_media_timeExtent)
                .range([height - scaledAvg_social_media_timeMargin, scaledAvg_social_media_timeMargin * 2]);

            var centerCirclesInScaleBandOffset = Avg_social_media_timeScaleX.bandwidth() / 2;
            return {
                x: d3.forceX(function (d) {
                    return Avg_social_media_timeScaleX(continentNames[d.ContinentCode]) + centerCirclesInScaleBandOffset;
                }).strength(forceStrength),
                y: d3.forceY(function (d) {
                    return Avg_social_media_timeScaleY(d.Avg_social_media_time);
                }).strength(forceStrength)
            };
        }

    }

    function createForceSimulation() {
        forceSimulation = d3.forceSimulation()
            .force("x", forces.combine.x)
            .force("y", forces.combine.y)
            .force("collide", d3.forceCollide(forceCollide));
        forceSimulation.nodes(countries)
            .on("tick", function () {
                circles
                    .attr("cx", function (d) {
                        return d.x;
                    })
                    .attr("cy", function (d) {
                        return d.y;
                    });
            });
    }

    function forceCollide(d) {
        return countryCenterGrouping() || Avg_social_media_timeGrouping() ? 0 : circleRadiusScale(d.Avg_social_media_time) + 1;
    }

    function countryCenterGrouping() {
        return isChecked("#country-centers");
    }

    function Avg_social_media_timeGrouping() {
        return isChecked("#Avg_social_media_time");
    }

    function addFlagDefinitions() {
        var defs = svg.append("defs");
        defs.selectAll(".flag")
            .data(countries)
            .enter()
            .append("pattern")
            .attr("id", function (d) {
                return d.CountryCode;
            })
            .attr("class", "flag")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("patternContentUnits", "objectBoundingBox")
            .append("image")
            .attr("width", 1)
            .attr("height", 1)
            // xMidYMid: center the image in the circle
            // slice: scale the image to fill the circle
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("xlink:href", function (d) {
                return "flags/" + d.CountryCode + ".svg";
            });
    }

    function addFillListener() {
        d3.selectAll('input[name="fill"]')
            .on("change", function () {
                toggleContinentKey(!flagFill() && !Avg_social_media_timeGrouping());
                updateCircles();
            });
    }

    function addGroupingListeners() {
        addListener("#combine", forces.combine);
        addListener("#country-centers", forces.countryCenters);
        addListener("#continents", forces.continent);

        function addListener(selector, forces) {
            d3.select(selector).on("click", function () {
                updateForces(forces);
                toggleContinentKey(!flagFill() && !Avg_social_media_timeGrouping());
            });
        }

        function updateForces(forces) {
            forceSimulation
                .force("x", forces.x)
                .force("y", forces.y)
                .force("collide", d3.forceCollide(forceCollide))
                .alphaTarget(0.5)
                .restart();
        }

    }
}
