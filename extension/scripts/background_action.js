console.log('chrome background action');

chrome.browserAction.onClicked.addListener(function (tab) { //Fired when User Clicks ICON
	console.log("ad-highlighter click btn");
	$('.hotSpot').show();
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	  chrome.tabs.sendMessage(tabs[0].id, {status: "1"}, function(response) {
	     console.log(response);
	  });
	});
});

