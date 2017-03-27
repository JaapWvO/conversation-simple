// The PayloadPanel module is designed to handle
// all display and behaviors of the conversation column of the app.
/* eslint no-unused-vars: "off" */
/* global Api: true, Common: true, PayloadPanel: true*/

var PayloadPanel = (function() {
  var settings = {
    selectors: {
      payloadColumn: '#payload-column',
      payloadInitial: '#payload-initial-message',
      payloadRequest: '#payload-request',
      payloadResponse: '#payload-response'
    },
    payloadTypes: {
      request: 'request',
      response: 'response'
    }
  };

  // Publicly accessible methods defined
  return {
    init: init,
    togglePanel: togglePanel,
    setColumnVisibility: setColumnVisibility
  };

  // Initialize the module
  function init() {
    payloadUpdateSetup();
  }

  // Set column visibility, either true or false. If no parameter then toggle.
  function setColumnVisibility(mode){
    var column = document.querySelector(settings.selectors.payloadColumn);
    var isHidden = column.classList.contains('hidden');
    
    // If no parameter then toggle
    if (mode===undefined || (typeof mode) !== boolean) mode = ! isHidden;
   	
    if (mode === true && isHidden) column.classList.remove('hidden');    
    if (mode === false && !isHidden) column.classList.add('hidden');
  }
  
  // Toggle panel between being:
  //    reduced width (default for large resolution apps)
  //    hidden (default for small/mobile resolution apps)
  //    full width (regardless of screen size)
  function togglePanel(event, element) {
    var payloadColumn = document.querySelector(settings.selectors.payloadColumn);
    
    // When button pressed, always remove the 'hidden' attribute from the column
    if (payloadColumn.classList.contains('hidden')) { payloadColumn.classList.remove('hidden'); }
    
    if (element.classList.contains('full')) {
      element.classList.remove('full');
      payloadColumn.classList.remove('full');
    } else {
      element.classList.add('full');
      payloadColumn.classList.add('full');
    }
  }

  // Set up callbacks on payload setters in Api module
  // This causes the displayPayload function to be called when messages are sent / received
  function payloadUpdateSetup() {
    var currentRequestPayloadSetter = Api.setRequestPayload;
    Api.setRequestPayload = function(newPayloadStr) {
      currentRequestPayloadSetter.call(Api, newPayloadStr);
      displayPayload(settings.payloadTypes.request);
    };

    var currentResponsePayloadSetter = Api.setResponsePayload;
    Api.setResponsePayload = function(newPayload) {
      currentResponsePayloadSetter.call(Api, newPayload);
      displayPayload(settings.payloadTypes.response);
    };
  }

  // Display a request or response payload that has just been sent/received
  function displayPayload(typeValue) {
    var isRequest = checkRequestType(typeValue);
        
    if (isRequest !== null) {
      // Create new payload DOM element
      var payloadDiv = buildPayloadDomElement(isRequest);
      var payloadElement = document.querySelector(isRequest
              ? settings.selectors.payloadRequest : settings.selectors.payloadResponse);
      // Clear out payload holder element
      while (payloadElement.lastChild) {
        payloadElement.removeChild(payloadElement.lastChild);
      }
      // Add new payload element
      payloadElement.appendChild(payloadDiv);
      // Set the horizontal rule to show (if request and response payloads both exist)
      // or to hide (otherwise)
      var payloadInitial = document.querySelector(settings.selectors.payloadInitial);
      if (Api.getRequestPayload() || Api.getResponsePayload()) {
        payloadInitial.classList.add('hide');
      }
      
      // Action intents that apply to this panel
      // TODO maybe generalize and move to more generic location
      if (isRequest === false && Api.getResponsePayload() && Api.getResponsePayload().intents && Api.getResponsePayload().intents[0]) {
      	var intent = Api.getResponsePayload().intents[0].intent;
      	// intent can be show, hide, or yes (if it was low confidence and has been confirmed in the WCS dialog)
      	// Which event has been confirmed is in the context.confirmed_event
      	switch (intent) {
      		case "show":
      		case "hide":
      		case "yes":
      			var confirmedIntent = Api.getResponsePayload().context.confirmed_intent;
      			// check also that entity is for this panel
      			if (confirmedIntent && 
      					Api.getResponsePayload().entities.find(
      						function (e) {return e.entity === "ScreenPanel" && e.value === "Payload paneel";})) {
					// confirmedEvent is either show or hide      							
      				setColumnVisibility(confirmedIntent === "show");
  				}

      			break;
      		default:
      			// no action
      	}
      }
    }    
  }

  // Checks if the given typeValue matches with the request "name", the response "name", or neither
  // Returns true if request, false if response, and null if neither
  // Used to keep track of what type of payload we're currently working with
  function checkRequestType(typeValue) {
    if (typeValue === settings.payloadTypes.request) {
      return true;
    } else if (typeValue === settings.payloadTypes.response) {
      return false;
    }
    return null;
  }

  // Constructs new DOM element to use in displaying the payload
  function buildPayloadDomElement(isRequest) {
    var payloadPrettyString = jsonPrettyPrint(isRequest
            ? Api.getRequestPayload() : Api.getResponsePayload());

    var payloadJson = {
      'tagName': 'div',
      'children': [{
        // <div class='header-text'>
        'tagName': 'div',
        'text': isRequest ? 'User input' : 'Watson understands',
        'classNames': ['header-text']
      }, {
        // <div class='code-line responsive-columns-wrapper'>
        'tagName': 'div',
        'classNames': ['code-line', 'responsive-columns-wrapper'],
        'children': [{
          // <div class='line-numbers'>
          'tagName': 'pre',
          'text': createLineNumberString((payloadPrettyString.match(/\n/g) || []).length + 1),
          'classNames': ['line-numbers']
        }, {
          // <div class='payload-text responsive-column'>
          'tagName': 'pre',
          'classNames': ['payload-text', 'responsive-column'],
          'html': payloadPrettyString
        }]
      }]
    };

    return Common.buildDomElement(payloadJson);
  }

  // Format (payload) JSON to make it more readable
  function jsonPrettyPrint(json) {
    if (json === null) {
      return '';
    }
    var convert = JSON.stringify(json, null, 2);

    convert = convert.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(
      />/g, '&gt;');
    convert = convert
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function(match) {
          var cls = 'number';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'key';
            } else {
              cls = 'string';
            }
          } else if (/true|false/.test(match)) {
            cls = 'boolean';
          } else if (/null/.test(match)) {
            cls = 'null';
          }
          return '<span class="' + cls + '">' + match + '</span>';
        });
    return convert;
  }

  // Used to generate a string of consecutive numbers separated by new lines
  // - used as line numbers for displayed JSON
  function createLineNumberString(numberOfLines) {
    var lineString = '';
    var prefix = '';
    for (var i = 1; i <= numberOfLines; i++) {
      lineString += prefix;
      lineString += i;
      prefix = '\n';
    }
    return lineString;
  }
}());
