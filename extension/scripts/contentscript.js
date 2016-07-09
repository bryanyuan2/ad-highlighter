(function() {

	$(document).ready(function() {
		console.log('ad-highlighter console log');

		// configs
		var borderStyleHL = "3px solid red";
		var adsImageWidth = "60px";
		var adsImageHeight = "60px";
		var insertScoreThreshold = 10;
		var windowWidth = $(window).width();
		var windowHeight = $(window).height();
		var localStorageWidth = localStorage.adsAverageX ? parseInt(localStorage.adsAverageX) : 0;
		var localStorageHeight = localStorage.adsAverageY ? parseInt(localStorage.adsAverageY) : 0;
		var localStorageIP = "0.0.0.0";
		var targetDomainList = [
			{ domain: 'mobile01.com', selector: 'a', pattern: 'adredir'},
			{ domain: 'gamer.com.tw', selector: 'a', pattern: 'adcounter'},
			{ domain: 'japantoday.com', selector: 'a', pattern: 'ads.gplusmedia'},
			{ domain: 'search.yahoo.com', selector: 'a', pattern: 'r.msn.com'},
			{ domain: 'search.yahoo.co.jp', selector: 'h3 a', pattern: 'rd.listing.yahoo.co.jp'},
			{ domain: 'www.famitsu.com', selector: 'a', pattern: 'webtracker.jp'},
			{ domain: 'www.goo-net.com', selector: 'a', pattern: 'proto2ad'},
			{ domain: 'www.hmv.co.jp', selector: 'a', pattern: 'webtracker.jp'}
		];
		// backendDomain 
		var backendDomain = "";
		var actionType = ['insert', 'delete'];
		var mockScore = {autos: 0, celebrity: 2, finance: 0, food: 2, movies: 0, music: 2, sports: 0, tech: 0, travel: 1, shopping: 2, game: 10};
		var removeAdsCount = 0;
		var highlightAdsCount = 0;
		var hotSpot;
		var final_ads = [];
		var mock_ads = [
			{
				"feature":{"sports":1,"finance":0,"movies":0,"celebrity":0,"music":0,"tech":0,"autos":0,"food":0,"travel":0,"shopping":6,"game":10},
				"image": null,
				"page_url": "",
				"text": "mock ads #1"
			},
			{
				"feature":{"sports":8,"finance":1,"movies":0,"celebrity":0,"music":0,"tech":0,"autos":4,"food":1,"travel":1,"shopping":6,"game":10},
				"image": null,
				"page_url": "",
				"text": "mock ads #2"
			},
			{
				"feature":{"sports":8,"finance":1,"movies":0,"celebrity":0,"music":10,"tech":0,"autos":0,"food":1,"travel":1,"shopping":6,"game":1},
				"image": null,
				"page_url": "",
				"text": "mock ads #3"
			}			
		];
		var final_ads_count = 0;

		/**
		 * Comment page ad remove function because I still cannot find way to 
		 * remove Ads on different site. (They are in different dom architecture)
		 **/
		/*$( "a" ).each(function( index ) {
			for (x in targetDomainList) {
				if ($(this).attr("href") && $(this).attr("href").indexOf(targetDomainList[x].pattern) > -1) {

					$(this).addClass("adsOnTrack");

					var adsRmBtn = document.createElement("span");
					//Remove Page Ads
					$(adsRmBtn).on("click", $.proxy(function(e) {
						event.preventDefault();
        				event.stopPropagation();
        				$(this).parents('div').get(0).remove();
    				}, this));
					$(adsRmBtn).addClass("adsOnTrackRmBtn");

					$(this).append(adsRmBtn);
				}
			}
		});*/
		$.when(getUserIP()).done(function(){
		localStorageIP = localStorage.userIP;
		console.log("IP is " + localStorageIP);
		$.when(getUserScore()).then(function(score){
			var userScore = score;
			console.log("userScore", userScore);
			console.log("diff = ", diffScore(userScore, mockScore, insertScoreThreshold));

			// hotspot
			hotSpot = document.createElement("div");
			$(hotSpot).addClass("hotSpot").addClass("top");


			var cloneUrlAry = [];
			var cloneTextAry = [];
			var cloneImgAry = [];
			var cloneImgSrcAry = [];
			var cloneTypeAry = [];
			var pre_deterred;

			//console.log("$(window).height()", $(window).height());
			//console.log("$(window).width()", $(window).width());
			//console.log("localStorageWidth", localStorageWidth);
			//console.log("localStorageHeight", localStorageHeight);

			function preloading() {
				var deferreds = [];
				$('a').filter(function(index) {
					for(x in targetDomainList) {
						var currUrl = window.location.href;
						var currHref = (typeof $(this).attr('href') === 'undefined') ? 'undefined' : $(this).attr('href');
						//console.log("currUrl", currUrl);
						//console.log("currHref", currHref);
						if ( currUrl.indexOf(targetDomainList[x].domain) !== -1 && currHref.indexOf(targetDomainList[x].pattern) > -1) {
							// get href
							var getText = $(this).text();
							var getImage = $(this).find('img').attr('src');
							//console.=log("$(this).attr('href')", $(this).attr('href'));
							//console.log("$(this).find('img').attr('src')", $(this).find('img').attr('src'));
							console.log("print ", backendDomain + "/ads/?image__exact=" + getImage);

							// get each ads info from backend DB
							deferreds.push($.ajax({
								method: "GET",
							  	url: backendDomain + "/ads/?image__exact=" + getImage
							})
							.done(function(data) {
								//This should be empty when it's text ads
								// console.log("this ", data.data);
								if (typeof data.data === "undefined") { return }
								else if (!data.data.length) { return };
								var ad_score = data.data[0].feature;
								for(var i=1; i<data.data.length; i++){
									if(data.data[i].action == "delete" && data.data[i].user_ip == localStorageIP){
										removeAdsHL(data.data[i].image);
										console.log("deleted: " + data.data[i].image);
										return;
									}
									for(type in data.data[i].feature){
										ad_score[type] = (data.data[i].action == "delete")? ad_score[type] - data.data[i].feature[type] : ad_score[type] + data.data[i].feature[type];
										if(ad_score[type] < 0) ad_score[type] = 0;
									}
								}
								for(type in ad_score){
									ad_score[type] = Math.round(ad_score[type] / data.data.length);
								}
								var final_ad = {};
								final_ad.feature = ad_score;
								final_ad.text = data.data[0].text;  // TODO: should update when support yahoo search ads
								final_ad.image = data.data[0].image;
								final_ad.page_url = data.data[0].page_url;  // TODO: if different page_url for same ad?
								final_ads.push(final_ad);
								console.log(final_ads);

								//pre_deterred.resolve();
							}));

							// text
							// get each ads info from backend DB
							deferreds.push($.ajax({
								method: "GET",
							  	url: backendDomain + "/ads/?text__exact=" + getText
							})
							.done(function(data) {
								//This should be empty when it's text ads
								// console.log("this ", data.data);
								if (typeof data.data === "undefined") { return }
								else if (!data.data.length) { return };
								var ad_score = data.data[0].feature;
								for(var i=1; i<data.data.length; i++){
									if(data.data[i].action == "delete" && data.data[i].user_ip == localStorageIP){
										//removeAdsHL(data.data[i].image);
										console.log("deleted: " + data.data[i].image);
										return;
									}
									for(type in data.data[i].feature){
										ad_score[type] = (data.data[i].action == "delete")? ad_score[type] - data.data[i].feature[type] : ad_score[type] + data.data[i].feature[type];
										if(ad_score[type] < 0) ad_score[type] = 0;
									}
								}
								for(type in ad_score){
									ad_score[type] = Math.round(ad_score[type] / data.data.length);
								}
								var final_ad = {};
								final_ad.feature = ad_score;
								final_ad.text = data.data[0].text;  // TODO: should update when support yahoo search ads
								final_ad.image = data.data[0].image;
								final_ad.page_url = data.data[0].page_url;  // TODO: if different page_url for same ad?
								final_ads.push(final_ad);
								console.log(final_ads);

								//pre_deterred.resolve();
							}));
						}
					}
					//pre_deterred.promise();
				});
				return deferreds;
			}

			var deferredsing = preloading();

			$.when.apply(null, deferredsing).done(function() {
				console.log("preloading done");
				console.log("fix = ", JSON.stringify(final_ads));

				if(!final_ads.length) final_ads = mock_ads;

				for(row in final_ads) {
					var targetAds = final_ads[row];
					console.log('targetAds', targetAds);
					var adsType = targetAds.image ? "image" :  "text";

					if (adsType == 'image') {
						cloneImgAry.push('<img width="' + adsImageWidth + '" height="' + adsImageHeight + '" src="' + targetAds.image + '" />');
					} else {
						cloneImgAry.push('');
					}
					cloneImgSrcAry.push(targetAds.image);

					cloneTextAry.push(targetAds.text);
					var containsText = targetAds.image ? targetAds.image : targetAds.text;
					console.log("containsText", containsText);
					var tarUrl = "#";
					if (targetAds.image !== null) {
						tarUrl = $('img[src*="' + targetAds.image + '"]').parents("a").attr("href");
					} else {
						tarUrl = $('body a:contains("' + targetAds.text + '")').parents("a").attr("href");
					}
					tarUrl = tarUrl ? tarUrl : "#";
					console.log("tarUrl", tarUrl);
					cloneUrlAry.push(tarUrl);

					if( diffScore(userScore, targetAds.feature, insertScoreThreshold) ) {
						console.log("ads click +");
						makrAdsHL(adsType, containsText, targetDomainList[getDomainIndex()].pattern);
						cloneTypeAry.push('hightlight');
						highlightAdsCount++;
					} else {
						console.log("ads click -");
						removeAdsHL(containsText);
						cloneTypeAry.push('remove');
						removeAdsCount++;
					}
				}
			});

			function getDomainIndex() {
				for (x in targetDomainList) {
					if ( window.location.href.indexOf(targetDomainList[x].domain) != -1){
						return x;
					}
				}
			}

			// ads click handling
			$('a').click(function(e) {
				for(x in targetDomainList) {
					console.log('check target ads in domain list');
					if ( window.location.href.indexOf(targetDomainList[x].domain) != -1 && $(this).attr('href').indexOf(targetDomainList[x].pattern) > -1) {
						console.log("get target ads match in domain list");
						if ($(this).find("img").length != 0) {
							makrAdsHL('image', $(this).find("img").attr("src"), targetDomainList[x].pattern);
						} else {
							makrAdsHL('text', $(this).text(), targetDomainList[x].pattern);
						}

						var pageUrl = window.location.href;
						var adUrl = $(this).attr("href");
						var adText = $(this).text();
						var feature = userScore;
						var adPos = $(this).parent().position();
						var adText = $(this).text() ? $(this).text() : "this is an image ads. click to visit " + adUrl;
						var adImg = $(this).find("img").clone();
						var adImgSrc = $(this).find("img").attr("src");;
						$(adImg).css({"width": adsImageWidth, "height": adsImageHeight});

						cloneUrlAry.push($(this).attr("href"));
						cloneImgAry.push(adImg);
						cloneTextAry.push(adText);

						// console
						/*
						console.log("pageUrl ", pageUrl);
						console.log("adUrl ", adUrl);
						console.log("adImg ", adImg);
						console.log("adImgSrc ", adImgSrc);
						console.log("adText ", adText);
						console.log("adPos left ", adPos.left);
						console.log("adPos top ", adPos.top);
						console.log("userScore ", userScore);
						console.log("DOM class ", $(this).parent().attr("class"));
						console.log("DOM id ", $(this).parent().attr("id"));

						console.log("cursor x", e.pageX);
						console.log("cursor y", e.pageY);
						*/
						// set localstorage
						localStorageWidth = localStorage["adsAverageX"] = (localStorageWidth + e.pageX)/2;
						localStorageHeight = localStorage["adsAverageY"] = (localStorageHeight + e.pageY)/2;

						//console.log("localStorageWidth", localStorageWidth);
						//console.log("localStorageHeight", localStorageHeight);

						// change hotspot region
						countHotSpotPosition(hotSpot);

						// send click ads info to DB
						console.log("insert data ajax call");
						console.log({data: JSON.stringify({
								'page_url': pageUrl,
								'image': adImgSrc,
								'user_ip': localStorageIP,
								'feature': userScore,
								'action': 'click'
							})});

						$.ajax({
							method: "POST",
							url: backendDomain + "/ads/",
							//processData: false,
							data: JSON.stringify({
								'page_url': pageUrl,
								'image': adImgSrc,
								'text': adText,
								'user_ip': localStorageIP,
								'feature': userScore,
								'action': 'click'
							}),
							contentType: "application/json; charset=utf-8",
                   			dataType: "json"
						})
						.done(function(data) {
							console.log("insert event", data);
						});
					}
				}
			});

			// ads hotspot region
			chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
				if(request.status == '1') {
					$(hotSpot).text("");
					$("body").before(hotSpot);
					if (cloneTypeAry.length === 0) {
						// array is empty
						var emptyText = document.createElement("div");
						$(emptyText).addClass("hotspotText").text("No more Ads highlighting");
						$(hotSpot).append(emptyText);

					} else {
						var hotSpotHead = document.createElement("div");
						var hotSpotBody = document.createElement("div");
						$(hotSpotHead).addClass("hotSpotHead").html('highlighted <span class="headerText">' + highlightAdsCount + '</span> ads');

						$(hotSpotBody).addClass("hotSpotBody");

						$(hotSpot).append(hotSpotHead);

						if (jQuery.inArray('remove', cloneTypeAry) > -1) {
							// if ads are more than 5, the 6th and any later ads are appended in hidden div.

							// create elements
							var hotSpotFoot = document.createElement("div");
							var hotSpotFootHead = document.createElement("div");
							$(hotSpotFootHead).html('Disliked <span class="headerText">' + removeAdsCount + '</span> ads');

							var hotSpotBtn = document.createElement("a");
							$(hotSpotBtn).html('Show/Hide Ads');

							// add classNames(sorry for using different way)
							// hotSpotFoot is hidden as default by css
							$(hotSpotFoot).addClass("hotSpotFoot show");
							$(hotSpotBtn).addClass("hotSpotBtn");
							$(hotSpotFootHead).addClass("hotSpotHead hotSpotFootHead");

							// create events
							$(hotSpotBtn).on('click', function(e){
								$(hotSpotFoot).toggleClass('show');
							});

							$(hotSpotFootHead).append(hotSpotBtn);
							$(hotSpot).append(hotSpotBody).append(hotSpotFootHead).append(hotSpotFoot);
						} else {
							$(hotSpot).append(hotSpotBody);
						}

						// update ads
						$.each(cloneTypeAry, function (key, val) {
							// use <a> tag for an AD container
							var adUnit = document.createElement("a");
							var adUnitHead = document.createElement("div");
							var adUnitBody = document.createElement("div");
							var adUnitRemoveBtn = document.createElement("span");

							// set classNames to elements
							$(adUnit).addClass("adUnit")
							$(adUnitHead).addClass("adUnitHead");
							$(adUnitBody).addClass("adUnitBody");
							$(adUnitRemoveBtn).addClass("adUnitRemoveBtn");
							$(adUnitRemoveBtn).on("click", removeCloneAd);

							$(adUnit).hover(function(){
								$(this).addClass("shakeme");
							}, function(){
								$(this).removeClass("shakeme");
							});

							if ( cloneTypeAry[key] == 'hightlight') {
								$(adUnit).addClass('hightlight');
							} else {
								$(adUnit).addClass('remove');
							}
							// cloneUrlAry[key]
				    		$(adUnit).attr({"href": cloneUrlAry[key], "target": "_blank"});
				    		//$(adUnit).append(adsContainer);
				    		$(hotSpot).append(adUnit);

							// text
							if (cloneTextAry[key] == null) {
								$(adUnitBody).html("this is an image ads. click to visit <span class='descLink'>" + cloneUrlAry[key] + "</span>");
							} else {
								$(adUnitBody).text(cloneTextAry[key]);
							}

							// show 5 ads on hotSpot
							if( cloneTypeAry[key] != 'remove' ) {
								$(hotSpotBody).append(adUnit);
							} else {
								$(hotSpotFoot).append(adUnit);
							}
							$(adUnit).append(adUnitHead).append(adUnitBody).append(adUnitRemoveBtn);
							$(adUnitHead).append(cloneImgAry[key]);
						});
					}
					$(hotSpot).show();

                    // Arai opinion start
                    // var hotspot_pos = actionToPos($(hotSpot), 'getName');
                    /*
                    function getPosType($elm) {
                        if ($elm.hasClass("top")) {
                                return "top";
                        } else if ($elm.hasClass("right")) {
                                return "right";
                        } else if ($elm.hasClass("left")) {
                                return "left";
                        } else if ($elm.hasClass("bottom")) {
                                return "bottom";
                        }
                    }
                    function getHidePosObj ($elm) {
                    	var prop = getPosType($elm),
                    		val;
                    	if(prop === 'top' || prop === 'bottom') {
                    		val = $elm.height() - 20;
                    	} else {
                    		val = $elm.width() - 20;
                    	}
                    	return [prop, val];
                    }
                	var prevPosType,
                		hotSpotPosType = getHidePosObj($(hotSpot))[0],
                		hotSpotHideVal = getHidePosObj($(hotSpot))[1];
                    function showHotSpot() {
	                    hotSpot.className = hotSpot.className.replace(' hide','');
	                    hotSpot.style['margin-'+prevPosType] = 'auto';
	                    hotSpot.style['margin-'+hotSpotPosType] = '0px';
	                    prevPosType = hotSpotPosType;
                   }
                    function hideHotSpot () {
                        hotSpot.className += ' hide';
	                    hotSpot.style['margin-'+prevPosType] = 'auto';
	                    hotSpot.style['margin-'+hotSpotPosType] = '-'+hotSpotHideVal+'px';
	                    prevPosType = hotSpotPosType;
                    }
                    var timerID = setTimeout(hideHotSpot,3000);

                    $('.hotSpot').hover(
                    	function(){
                    		clearTimeout(timerID);
                    		showHotSpot();
                    	},
                    	function(){
                    		timerID = setTimeout(hideHotSpot,500);
                    	});


                    */
                    // Arai opinion end
				} // if length

			});

			$("body").click(function(){
				$(hotSpot).hide();
			});

			/*
            $(hotspot_container).hover(function(){
                    console.log(".hotspot_container in");
                    $(this).animate({"height":"220px"}, "fast");
                    $(".adsContainer").hide();
                }, function(){
                    console.log(".hotspot_container out");
                    $(this).animate({"height":"20px"}, "fast");
                    $(".adsContainer").show();
                }
            );
			*/
            // Arai opinion end
            function deleteAjax(eleIndex) {
            	$.ajax({
					method: "POST",
					url: backendDomain + "/ads/",
					data: JSON.stringify({
						'page_url': window.location.href,
						'text': cloneTextAry[eleIndex],
						'image': cloneImgSrcAry[eleIndex],
						'user_ip': localStorageIP,
						'feature': userScore,
						'action': 'delete'
					}),
            		contentType: "application/json; charset=utf-8",
        			dataType: "json"
				})
				.done(function(data) {
					console.log("Send delete request to DB");
					userScore = data.feature;
				});
            }

			function removeCloneEle(eleIndex) {
				deleteAjax(eleIndex);
				if (eleIndex != -1) {
					cloneUrlAry.splice(eleIndex, 1);
					cloneImgAry.splice(eleIndex, 1);
					cloneImgSrcAry.splice(eleIndex, 1);
					cloneTextAry.splice(eleIndex, 1);
					cloneTypeAry.splice(eleIndex, 1);
				}
			}

			function removeCloneAd () {
				event.preventDefault();
				//Todo remove ad in cloneUrlAry
				var rmLink = $(this).parents("a").attr("href");
				var indexOfLink = jQuery.inArray(rmLink, cloneUrlAry);
				removeCloneEle(indexOfLink);

				$(this).parent().hide();
			}
		})});

		function getUserScore() {
			var d = new $.Deferred();
			chrome.runtime.sendMessage({method: "getStatus"}, function(response) {
				d.resolve(response.score);
			})
			return d;
		}

		//makrAdsHL('text', '官方網站');
		function makrAdsHL(adsType, containsText, pattern) {
			var highlightblock = document.createElement("div");
			$(highlightblock).addClass("hlAdsBlk");
			$(highlightblock).append('<div class="hlTriBlk"/>');
			$(highlightblock).append('<span class="hlStarBlk"/>');
			if (adsType === 'image') {
				$('img[src*="' + containsText + '"]').closest("div").addClass("hlAdsDiv");
				$('img[src*="' + containsText + '"]').closest("div").append(highlightblock);
			} else {
				$('body a[href*="' + pattern + '"]:contains("' + containsText + '")').parent().addClass("hlAdsText");
				//$('body a:contains("' + containsText + '")').closest("div").append(highlightblock);
			}
		}

		function removeAdsHL(containsText) {
			console.log("containsText remove", containsText);
			$('img[src="' + containsText + '"]').closest("div").remove();
		}

		function countHotSpotPosition(hotSpot) {
			$(hotSpot).removeClass("top").removeClass("bottom").removeClass("left").removeClass("right");
			if (localStorageHeight/windowHeight > 0.67) {
				// bottom
				$(hotSpot).addClass("bottom");
			} else if (localStorageHeight/windowHeight < 0.33) {
				// top
				$(hotSpot).addClass("top");
			} else if (localStorageWidth/windowWidth > 0.67) {
				// right
				$(hotSpot).addClass("right");
			} else if (localStorageWidth/windowWidth < 0.33) {
				// left
				$(hotSpot).addClass("left");
			} else {
				// default top
				$(hotSpot).addClass("top");
			}
		}

		// edit distance counting
		function diffScore(localScore, mockScore, scoreThreshold) {
			var sum = 0;
			//console.log("diff s1", localScore);
			//console.log("diff s2", mockScore);
			for (type in mockScore) {
				localVal = (typeof localScore[type] === 'undefined') ? 0 : parseFloat(localScore[type]);
				mockVal = (typeof mockScore[type] === 'undefined') ? 0 : parseFloat(mockScore[type]);
				// console.log("userVal", localVal);
				// console.log("mockVal", mockVal);
				sum = sum + Math.abs(localVal - mockVal) * Math.abs(localVal - mockVal);
			}
			sum = Math.sqrt(sum);
			console.log('edit distance ', sum);
			return (sum < scoreThreshold) ? true: false;
		}

		function getUserIP() {
			var d = new $.Deferred();
			console.log('Loading IP now');
			if (localStorage.userIP) {
				d.resolve(localStorage.userIP);
				return d.promise();
			} else {
				console.log('Get IP by Ajax');
				$.ajax({
					method: "GET",
			  		url: 'http://freegeoip.net/json/',
			  		tryCount: 0,
			  		defaultIP: "0.0.0.0",
			  		success: function(data) {
			  			if (!data.ip) {
			  				if(this.tryCount<3){
			  					this.tryCount++;
			  					console.log(this.tryCount + 'time to retry Ajax call');
			  					$.ajax(this);
			  				} else {
			  					localStorage["userIP"] = defaultIP;
			  					d.resolve(defaultIP);
			  				}
			  			} else {
			  				console.log("get ip", data.ip);
			  				localStorage["userIP"] = data.ip;
							d.resolve(data.ip);
			  			}
					},
					error: function (xhr, status, err) {
						console.log("get error", err);
						console.log("get error when getting ip so use default one");
						localStorage["userIP"] = data.ip;
						d.resolve(defaultIP);
					}
				});
				return d.promise();
			}
		}
	});

})();
