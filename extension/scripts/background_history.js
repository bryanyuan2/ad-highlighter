console.log('chrome background history api');


var domainKeywords = 
{
    "sports": ["sports.yahoo", "espn.", "nba."],
    "finance": ["money.yahoo", "finance.yahoo", "stock.yahoo"],
    "movies": ["movies.yahoo", "gyao.yahoo"],
    "celebrity": ["celebrity.yahoo"],
    "music": ["yahoo.streetvoice", "chakumero.yahoo"],
    "tech": ["tech.yahoo", "developer.yahoo"],
    "autos": ["autos.yahoo", "carview.yahoo"],
    "food": ["yahoo.gomaji.com", "cookpad.com"],
    "travel":["travel.yahoo", "agoda.com", "booking.com", "hotels.com", "yahoo.gomaji.com"],
    "shopping":["shopping.yahoo", "lohaco.jp", "rakuten", "momoshop", "pchome", "bid.yahoo", "mall.yahoo", "buy.yahoo", "taobao"],
    "game":["games.yahoo", "gamer.com"]
}

var userDomainRepresent = {
    "sports": 0,
    "finance": 0,
    "movies": 0,
    "celebrity": 0,
    "music": 0,
    "tech": 0,
    "autos": 0,
    "food": 0,
    "travel": 0,
    "shopping":0,
    "game": 0
}

var history_analysis = new $.Deferred();

$.when(history_analysis).done(function(feature){
  console.log("user history score = ", JSON.stringify(feature));
  localStorage.user_feature = JSON.stringify(feature);
});

// send userDomainRepresent to contentscript.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method == "getStatus"){
      //console.log(request, sender);
      sendResponse({score: normalizeScore(JSON.parse(localStorage.getItem('user_feature')))});
      localStorage.user_feature = updateUserfeature(sender);
    }else{
      sendResponse({}); // snub them.
    }
});

searchHistoryCounting();

/**** functions ****/ 

function normalizeScore(user_feature) { 
  var max = 0, ratio;
  for(type in user_feature){
    if(user_feature[type] > max) max = user_feature[type]; 
  }
  ratio = max / 10;
  for(type in user_feature){
    user_feature[type] = Math.round(user_feature[type] / ratio);
  }
  return user_feature;
}

function updateUserfeature(sender) {
    //console.log('update score: ' + sender.url);
    var user_feature =  JSON.parse(localStorage.getItem('user_feature'));
    for(type in domainKeywords){
      for(keyword in domainKeywords[type]){
        if(sender.url.indexOf(domainKeywords[type][keyword]) != -1){
          //console.log('match user_feature type: ' + type);
          user_feature[type] += 1;
          //console.log(user_feature);
        }
      }
    }
    //localStorage.user_feature = JSON.stringify(feature);
    return JSON.stringify(user_feature);
}

function searchHistoryCounting() {
    var d = new $.Deferred();
    chrome.history.search({text: '', maxResults: 10000}, function(results) {
        //console.log(results);
	 for(key in results){
          //console.log(results[key]);
          for(type in domainKeywords){
              //console.log(type);
            for(keyword in domainKeywords[type]){
              if(results[key].url.indexOf(domainKeywords[type][keyword]) != -1){
                  console.log(domainKeywords[type][keyword] + ' in ' + results[key].url);
	          userDomainRepresent[type] = userDomainRepresent[type] + results[key].visitCount;
                  //console.log(domainKeywords[type][keyword] + ' add ' + results[key].visitCount);
              }
            }
          }
        };
        d.resolve();
    });
    $.when(d).done(function(){
      history_analysis.resolve(userDomainRepresent);
    });
    return history_analysis;
}
