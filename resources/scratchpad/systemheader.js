//<!--
var oMonitor = new Object;
var ajax_timeoutid;

var FIELD_MESSAGE_TYPE_SUGGESTION = 'S';
var FIELD_MESSAGE_TYPE_DEFAULT    = 'D';
var FIELD_MESSAGE_TYPE_HELP       = 'H';

//------------------------------- extensions --------------------------------------------
$.fn.tagName   = function() {return this.get(0).tagName.toLowerCase();}
$.fn.inputType = function(newtype) {
    var newinput;
    //IE leaves a parentNode on the clone and so throws a manual exception in attr
    //which is good because IE cannot change the type attribute of inputs
    try {newinput = this.clone(true).attr("type", newtype);} catch (ex) {}

    if (newinput) {
        this.after(newinput);

        //copy events (before swap in)
        //jQuery 1.3 uses $.data(fromEl, 'events')
        var fromEl = this[0], events = fromEl && ($.data && $.data(fromEl, 'events') || fromEl.$events || fromEl.events) || {};
        for (var type in events) {
            // in jQuery 1.4.2+ event handlers are stored in an array, previous versions it is an object
            $.each(events[type], function(index, handler) {
                // in jQuery 1.4.2+ handler is an object with a handle property
                // in previous versions it is the actual handler with the properties tacked on
                var namespaces = handler.namespace !== undefined && handler.namespace || handler.type || '';
                namespaces = namespaces.length ? (namespaces.indexOf('.') === 0 ? '' : '.')+namespaces : '';
                $.event.add(newinput[0], type + namespaces, handler.handler || handler, handler.data);
            });
        }
        this.remove();
    }
    return newinput || this;
}
//IE does not support trim
if (typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {return this.replace(/^\s+|\s+$/g, '');}
}
String.prototype.addUrlParameter = function(sName, sValue) {return this + (this.indexOf('?') == -1 ? '?' : '&') + sName + '=' + sValue;}

//------------------------------- system message queues --------------------------------------------
function server_message(json_obj) {
  if (json_obj && json_obj.type && window[json_obj.type]) window[json_obj.type](json_obj);
}

function system_message_queue_json_receive(data, textStatus, jqXHR) {
  if (window.server_message) window.server_message(data);
  system_message_queue_json_wait();
}
function system_message_queue_json_wait() {
  $.getJSON( '/includes/semaphores/wait_queue_json.php', null, system_message_queue_json_receive);
}
function system_message_queue_json_send(json_obj) {
  if (window.JSON) {
    $.ajax({
      type: 'GET',
      url: '/includes/semaphores/send_queue_json.php',
      data: {json:JSON.stringify(json_obj)}
    });
  }
}

$(document).ready(function() {
    //------------------------------- misc --------------------------------------------
    if (window.server_message) system_message_queue_json_wait();
    if (window != window.top) $(document.body).addClass('embedded');

    //------------------------------- forms --------------------------------------------
    $("form").submit(function(){
      //forms submitted through the manual call to submit event do not include the submit button
      var submit_button = $(this).find("input[type='submit']");
      var hidden_submit = $(this).find("input[id='hidden_submit']");
      if (submit_button.length == 1 && hidden_submit.length == 0) {
        var name  = submit_button.attr("name");
        var value = submit_button.attr("value");
        submit_button.before('<input id="hidden_submit" type="hidden" name="' + name + '" value="' + value + '" />');
        submit_button.removeAttr("name"); //ensure that the submit does not get doubled up
      }
    });
    //extended form attributes: child SPANs have details of the extended attibutes
    //these functions are compatible with the uxml_formfield*() DB functions
    //and the forms.xsl plugin
    $(".extended_attributes.xinput").each(function() {
        var input = $(this).find(":input");

        //field selection on submit (ajax only and thus usually only admin screens)
        var fields = $(this).find("span.fields");
        if (fields.length) {
            input.click(function() {
                $("form *").attr("disabled", true);
                $("form *[name='" + fields.text() + "']").removeAttr("disabled");
            });
        }

        //defaults (some disappear on focus etc.)
        var xdefault      = $(this).find("span.field_message");
        var xdefault_type = $(this).find("span.field_message_type").text();
        if (xdefault.length && xdefault.text() != '') {
            //Focus: remove help text, leave default or suggestion
            if (xdefault_type == FIELD_MESSAGE_TYPE_HELP)
                input.focus(function(e) { if ($(this).val() == xdefault.text()) {
                        $(this).val('');
                        $(this).removeClass("input_default");
                        if ($(this).attr("name") == 'form_password') {
                            var newinput = $(this).inputType('password');
                            newinput.focus();
                            e.stopImmediatePropagation();
                        }
                        return false;
                    }
                });
            //blur: replace help and default, leave if only a suggestion
            if (xdefault_type == FIELD_MESSAGE_TYPE_HELP || xdefault_type == FIELD_MESSAGE_TYPE_DEFAULT)
                input.blur( function() { if ($(this).val() == '') {
                        $(this).val(xdefault.text());
                        if (xdefault_type == FIELD_MESSAGE_TYPE_HELP) $(this).addClass("input_default");
                        if ($(this).attr("name") == 'form_password') $(this).inputType('text');
                    }
                });
            //on startup: set help, default and suggestion
            input.each( function() { if ($(this).val() == '' || $(this).val() == xdefault.text()) {
                    $(this).val(xdefault.text());
                    if (xdefault_type == FIELD_MESSAGE_TYPE_HELP) $(this).addClass("input_default");
                    if ($(this).attr("name") == 'form_password') $(this).inputType('text');
                }
            });
        }

        //auto form action switching (ajax only and thus usually only admin screens)
        var action = $(this).find("span.action");
        if (action.length) {
            input.click(function() { $(this.form).attr("action", action.text()); });
            input.removeClass("disabled").removeAttr("disabled");
        }
    });

    //label highlight
    $("label").mouseover(function(){
        if (sfor = $(this).attr("for")) $("#" + sfor).addClass(   "labelover");
    });
    $("label").mouseout( function(){
        if (sfor = $(this).attr("for")) $("#" + sfor).removeClass(   "labelover");
    });

    $(".noautocomplete").attr("autocomplete", "off");

    $("form").submit(function(e) {
        var errors = '';
        $(this).find(".extended_attributes.xinput").each(function() {
            //objects
            var input            = $(this).find(":input");
            var required         = $(this).find("span.required");
            var validation_error = $(this).find("span.validation_error");
            var xdefault         = $(this).find("span.field_message");
            var xdefault_type    = $(this).find("span.field_message_type").text();
            var caption          = $(this).find("span.caption");

            //clear hints (default)
            if (xdefault.length && xdefault_type == FIELD_MESSAGE_TYPE_HELP && input.val() == xdefault.text()) input.val('');

            //validation
            if (required.length) {
                var required_text = required.text();
                if (required_text == '') required_text = '.+';
                var regexp = new RegExp(required_text);
                var value_text    = input.val();
                var caption_text  = caption.text();
                var type_text     = input.attr("type");
                var validation_error_text = validation_error.text();
                if (validation_error_text == '') {
                    switch (required_text) {
                        case '.+': {validation_error_text = caption_text + ' is required';break;}
                        default:   {validation_error_text = caption_text + ' is invalid (' + required_text + ')';break;}
                    }
                }
                if (type_text == "checkbox") value_text = (input.attr("checked") ? value_text : "off");
                //alert(name + '=' + value);
                if (!value_text.match(regexp)) errors += 'o - ' + validation_error_text + '\n';
            }
        });
        if (window.customsubmit) errors += customsubmit();
        if (errors != '') {
          alert('There are errors in your form:\n' + errors);
          e.stopImmediatePropagation(); //stop other submit handlers returning a true
          e.preventDefault();
        }
        return (errors == '');
    });

    //misc classes
    $(".backlink").attr("href", "backlink:").click(function() { history.go(-1); return false; });
    $(".cancel_bubble").click(function(e){e.stopPropagation();});
    $(".prevent_default").click(function(e){e.preventDefault();});

    //standard jquery elements (check for existence first)
    if ($(".ui-slider-1").slider) $(".ui-slider-1").slider({ min: -2, max: 2, steps: 5 });
    if ($("ul.nodrag").sortable) {
        $("ul.nodrag").sortable({ axis: 'y', opacity: 0.7, revert: true, placeholder: 'placeholder', start: sortstart, stop: resorted })
        $("ul.nodrag").addClass('candrag')    //apply draggable classes
                      .removeClass('nodrag'); //remove can't drag classes
        $("ul.candrag").bind("sortstop", function(){
          //TODO: re-assign last class...
        });
    }
    if ($(".draggable").draggable) {
      //bind $(document) to create, start, drag and stop
      $(".draggable").draggable();
    }
    if ($(".notabs").tabs) {
      if ($(".notabs > ul").length) { //an immediate child UL is required for the tabs list
        $(".notabs").tabs({
          select:function(event, ui){
            location.hash = $(ui.tab).attr("href");
            $.post('/includes/save_last.php', {url:location.href}); //update the last accessed page with the href + hash
          }
        })
          .addClass('aretabs')        //apply tab ok classes
          .removeClass('notabs');     //remove tab failed classes
      }
    }
    if ($(".datepicker").datepicker) {
        $(".datepicker").datepicker({ dateFormat: 'dd/M/yy' });
    }
    $("a.check").click(function(e){
      if (!confirm('are you sure?')) {
        e.preventDefault();
        e.stopImmediatePropagation(); //ajax click events etc.
      }
    });

    //run iframe src after document load so that the browser does not hang at document load
    $("iframe.delayedload").each(function() {
        if ($(this).attr("id")) $(this).attr("src", $(this).attr("id"));
    });
    $("form.ajax").submit(ajaxform).ajaxError(ajaxformerror);
    $("a.ajax").click(ajaxlink);
    $(".js_remove").remove();
    $(".js_hide").hide();               //hidden by JS
    $(".js_show").show();               //display:none; by default, shown by JS
    $(document.body).addClass("js_ok"); //indicate to entire stylesheet that javascript is ok
    $(".ajax_autosubmit"     ).change(function() {$(this.form).submit(); });
    $(".ajax_enable_onchange").keyup(  enable_onchange)
                              .change( enable_onchange)
                              .mouseup(enable_onchange);

    //value change monitor - used for typeahead amoungst other things
    $(".ajax_monitor").each(addMonitor);

    if ($(".dialog").dialog) $(".dialog").dialog({ autoOpen: false, modal: true, height: 400, width: 300 });

    //Quick tips - disable and links and show the first .quicktip instead
    $(".quicklink")
        .attr("href", "#")
        .attr("title", "")
        .addClass("quicklink_linked")
        .click(function(e) {
            $(this).find(".quicktip").show("slow");
            e.stopPropagation();
            e.preventDefault();
        })
        .mouseover(function(e) {
            e.stopPropagation();
        });
    $(document).mouseover(function() { $(".quicktip").hide("slow"); });
    $(document).click(function() { $(".typeahead ul").hide("slow"); });
});
function enable_onchange(){$(this).removeClass("ajax_submitted").find("input[type=submit]").removeClass("disabled").removeAttr("disabled");}

//------------------------------- misc sys funcs --------------------------------------------
var alertedOnce = false;
function alertOnce(s) {if (!alertedOnce) {alertedOnce = true;alert(s);}}
//FireBug console
function cdebug(s)    {if (window.console && window.console.debug   ) return window.console.debug.apply(   window.console, arguments);}
function cinfo(s)     {if (window.console && window.console.info    ) return window.console.info.apply(    window.console, arguments);}
function cwarn(s)     {if (window.console && window.console.warn    ) return window.console.warn.apply(    window.console, arguments);}
function cerror(s)    {if (window.console && window.console.error   ) return window.console.error.apply(   window.console, arguments);}
function cgroup(s)    {if (window.console && window.console.group   ) return window.console.group.apply(   window.console, arguments);}
function cgroupend(s) {if (window.console && window.console.groupEnd) return window.console.groupEnd.apply(window.console, arguments);}

//------------------------------- formatting funcs --------------------------------------------
function format_distance(distance) {
    return parseInt(distance / 100)/10 + ' km';
}

//------------------------------- ordering funcs --------------------------------------------
function order_distance(i1, i2) {return i1.distance - i2.distance;}
function order_title(i1, i2)    {return i1.title.toLowerCase() > i2.title.toLowerCase();}

//------------------------------- monitor --------------------------------------------
function addMonitor() {
    //check for the change function
    var monitor = this;
    var i = 0, func, classes = $(this).attr("class").split(' ');
    while (i < classes.length && classes[i].substr(0,7) != 'ajax_f_') i++;
    if (i < classes.length) {
        this.func = window[classes[i]];
        $(this).find(":input").each(function(){addMonitorValue(this, monitor);}); //store intial values
        $(this).keyup(monitorChange) //typing
            //.change(monitorChange)   //details in 1 input changed
            .mouseup(monitorChange); //a paste or sumink
    } else alert('no monitor function!');
}
function addMonitorValue(input, monitor) {
    //store the current value (ignoring defaults)
    var inputdefault = $(input).parent(".extended_attributes.xinput").find("span.field_message").text();
    var name         = $(input).attr("name");
    var inputval     = $(input).val();
    if (inputval == inputdefault) inputval = '';
    oMonitor[name]   = inputval;
}
function monitorChange() {
    var monitor = this;
    $(this).find(":input").each(function(){monitorCompareValue(this, monitor);});
}
function monitorCompareValue(input, monitor) {
    //compare values, this = each :input
    //monitor = the span class="ajax_monitor"
    var inputdefault = $(input).parent(".extended_attributes.xinput").find("span.field_message").text();
    var name         = $(input).attr("name");
    var inputval     = $(input).val();
    var inputold     = oMonitor[name];
    if (inputval == inputdefault) inputval = '';

    if (inputval != inputold) {
        oMonitor[name] = inputval;
        //restart timer
        if (ajax_timeoutid) clearTimeout(ajax_timeoutid);
        if (monitor.func) {
            $(input).addClass('monitor_wait');
            ajax_timeoutid = setTimeout(function(){
                $(input).removeClass('monitor_wait');
                monitor.func(monitor, input, inputval);
            }, 1000); //1 second delay
        } else alert('no monitor function!');
    }
}

function ajaxReplaceArea(jElement, sUrl, oFormdata, fCallback) {
  if (!sUrl) sUrl = document.location;                        //auto post back to current if not specified
  sUrl = sUrl.addUrlParameter('response:referal', 'exclude'); //we dont want users pressing the back button to this page
  var sDataType = 'xml';
  if (!canTransform()) {
    sUrl      = sUrl.addUrlParameter('response:server-side-transform', 'yes');
    sDataType = 'html';
  }

  //external monitoring with ajaxCheckComplete()
  ajaxInProgress     = true;
  ajaxRequiresReport = true;

  //use GETs because POSTs mean something else in GS
  $.get(
    sUrl,
    oFormdata,
    function(data, status) {
      ajaxReplaceAreaResult(data, status, jElement, fCallback);
    },
    sDataType
  );
}
function ajaxReplaceAreaResult(oDoc, status, jElement, fCallback) {
    if (oDoc instanceof XMLDocument) {
      //we have got an XMLDocument back so we need to client side transform
      //we assume capability to transform was checked at point of sending
      var transformCallback = function (oHTMLDoc) {ajaxReplaceAreaResult(oHTMLDoc, status, jElement, fCallback);};
      transform(oDoc, transformCallback);
    } else {
      //HTML data come back so insert it
      //oDoc is a string
      jElement.html(oDoc);
      ajaxInProgress = false;
      if (fCallback) fCallback(jElement);
    }
}

//------------------------------- client side transforms --------------------------------------------
function canTransform() {
  return window.ActiveXObject || (document.implementation && document.implementation.createDocument);
}
function getStylesheetProcessingHREF(oXMLDoc) {
  //TODO: compatibility?
  //http://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html
  //<?xml-stylesheet charset="utf-8" type="text/xsl" href="ajaxLoadChildren.xsl"?>
  var sStylesheet = null;
  var oStylesheet;
  var PROCESSING_INSTRUCTION_NODE = 7;
  var rxHREF = / href="([^"]+)"/i;
  if (
       (oXMLDoc)
    && (oXMLDoc.childNodes)
    && (oXMLDoc.childNodes.length)
    && (oStylesheet = oXMLDoc.childNodes[0])
    && (oStylesheet.nodeType == PROCESSING_INSTRUCTION_NODE)
    && (oStylesheet.target == 'xml-stylesheet' && oStylesheet.data)
    && (aMatches = rxHREF.exec(oStylesheet.data))
    && (aMatches.length > 1)
  ) {
    sStylesheet = aMatches[1];
  }

  return sStylesheet;
}
function transform(oXMLDoc, fCallback) {
  //look for stylesheet directive in the XML
  //<?xml-stylesheet charset="utf-8" type="text/xsl" href="ajaxLoadChildren.xsl"?>
  var sStylesheet;
  if (sStylesheet = getStylesheetProcessingHREF(oXMLDoc)) {
    $.get(
      sStylesheet,
      null,
      function(data, status) {
        transformWith(oXMLDoc, data, fCallback);
      },
      "xml"
    );
  } else alert('no stylesheet associated with the XML');
}

function transformWith(oXMLDoc, oStylesheetDoc, fCallback) {
  if (window.ActiveXObject) {
    sHTML = oXMLDoc.transformNode(oStylesheetDoc);
    //TODO: oHTMLDoc =
    alert('windows not supported yet');
  } else if (document.implementation && document.implementation.createDocument) {
    xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(oStylesheetDoc);
    oHTMLDoc = xsltProcessor.transformToFragment(oXMLDoc, document);
  }

  if (fCallback) fCallback(oHTMLDoc);
  return oHTMLDoc;
}

//------------------------------- ajax forms --------------------------------------------
var iajaxformerror     = 5,
    ajaxInProgress     = false, //set to true at ajax request start, and to false at end
    ajaxRequiresReport = false; //set to true at ajax request start, and to false once reported
function ajaxCheckComplete() {
  //this call may start before the actual ajax request has gone out (!ajaxRequiresReport)
  //the calls may miss the actual ajax processing (ajaxInProgress)
  //so: if a call did start and is not in progress
  //then: report it and mark it as reported ready for the next one
  if (ajaxRequiresReport && !ajaxInProgress) {
    ajaxRequiresReport = false; //mark as complete ready for the next ajaxCheckComplete() if any
    return true;
  }
  return false;
}
function ajaxformerror(e, request, ajaxOptions, thrownError) {
    //ajaxOptions.url
    //thrownError = HTTP error. This will be undefined if the document failed to parse or the main document was refreshed
    ajaxInProgress = false;
    if (iajaxformerror && thrownError) {
      alert(
        'ajax error (' + iajaxformerror + ') from [' + (ajaxOptions ? ajaxOptions.url : 'undefined') + ']:\n' +
        'error:[' + e + ']\n' +
        'request:[' + (request ? request.toString(20) : 'undefined') + ']\n' +
        'thrown:[' + thrownError + ']'
      );
      iajaxformerror--;
    }
}
function ajaxform(e) {
    var jForm     = $(this);
    //submit is not included by jQuery in its form serialisation
    //if the submit button did not trigger this then a standard submit value will be sent through
    var jSubmit   = $(e.target);
    var subname   = jSubmit.attr("name");
    var subval    = jSubmit.attr("value");
    var classes   = jForm.attr("class").split(' ');
    var action    = jForm.attr("action");
    var i         = 0;
    var debugajax = false, classname, funcname, func;

    //external monitoring with ajaxCheckComplete()
    ajaxInProgress     = true;
    ajaxRequiresReport = true;

    //we need an action for ajax
    if (!action) action = location.pathname;
    var jsonurl   = '/api' + action + '.ajaxForm?dir:referal=exclude'; //run the json version so we can get a validation response

    //find the function to run on return
    for (var i = 0; i < classes.length; i++) {
        classname = classes[i];
        if (classname.substr(0,7) == 'ajax_f_') {
            funcname = classname;
            func     = window[funcname];
            if (!func) alert('[' + funcname + '] does not exist!'); //required (must always be a response!)
        }
        if (classname.substr(0,10) == 'ajax_debug') debugajax = true;
    }

    //serialisation + submit button (not included by jQuery in its form serialisation)
    var formdata = jForm.serialize();
    if (formdata.length) formdata += '&';
    formdata += (subname?subname:'submit') + '=' + (subval?subval:'submitted');

    //debug
    if (debugajax) alert('ajax_debug request:\nFUNC:' + funcname + '\nURL:' + jsonurl + '\nFORM:' + formdata);

    //run ajax
    $.post(
        jsonurl, //must be in non-absolute jForm, e.g. /api/business/account/getphotos.ajaxjForm
        formdata,
        function(data, status) {
          ajaxInProgress = false;
          if (func && ajax_valid(data, status, debugajax)) {
            if (jForm) jForm.addClass('ajax_submitted').removeClass('ajax_validation_error');
            func(jForm, data, status, debugajax); //closure
          } else if (jForm) jForm.addClass('ajax_validation_error').removeClass('ajax_submitted');
        }
        ,"json"
    );
    return false;
}

function ajaxlink(e) {
    var jForm     = $(this);
    var classes   = jForm.attr("class").split(' ');
    var i         = 0;
    var debugajax = false, classname, funcname, func;
    var rawhref   = jForm.attr("href");
    var parts     = rawhref.split('?');
    var jsonurl   = '/api' + parts[0] + '.ajaxForm' + '?' + parts[1] + '&dir:referal=exclude'; //run the json version so we can get a validation response

    //find the function to run on return
    for (var i = 0; i < classes.length; i++) {
        classname = classes[i];
        if (classname.substr(0,7) == 'ajax_f_') {
            funcname = classname;
            func     = window[funcname];
            if (!func) alert('[' + funcname + '] does not exist!'); //required (must always be a response!)
        }
        if (classname.substr(0,10) == 'ajax_debug') debugajax = true;
    }

    var formdata = null;

    //debug
    if (debugajax) alert('ajax_debug request:\nFUNC:' + funcname + '\nURL:' + jsonurl + '\nFORM:' + formdata);

    //run ajax
    $.post(
        jsonurl, //must be in non-absolute jForm, e.g. /api/business/account/getphotos.ajaxForm
        formdata,
        function(data, status) {
          ajaxInProgress = false;
          if (func && ajax_valid(data, status, debugajax)) {
            if (jForm) jForm.addClass('ajax_submitted');
            func(jForm, data, status, debugajax); //closure
          } else if (jForm) jForm.addClass('ajax_validation_error');
        }
        ,"json"
    );

    //prevent normal actions
    e.preventDefault();
    e.stopPropagation();
    return false;
}

function ajax_valid(data, status, debugajax) {
    //convert text to JSON object
    if (debugajax) alert('ajax_debug response:\nDATA:\n' + data + '\nTYPE:' + typeof data);
    var jsonobj;
    try {jsonobj = eval(data);}
    catch (e) {
        //JSON object not well formed: hard system error!
        alert('AJAX response badly formed!\n' + e + '\n' + data);
        return false;
    }
    //JSON object reply well-formed, check details
    var ok = (jsonobj.status == 'ok');
    if (!ok) {
        var validation_errors = "There were validation errors submitting your form\n";
        var error;
        for (i in jsonobj.validation_errors) {
          error = jsonobj.validation_errors[i];
          if (typeof error == 'string') validation_errors += "o - " + jsonobj.validation_errors[i] + "\n";
        }
        alert(validation_errors);
    }
    return ok;
}

//common ajax reply functions
function ajax_f_debug(form, data, status) {
    alert('response:\nSTATUS:' + status + '\nDATA:\n' + data.toString(2));
}
function ajax_f_refresh(form) {
    document.location = document.location.toString().replace(/#.*/g, '');
}
function ajax_f_removeAncestorLI(form) {
    form.parents("li").hide("slow");
}
function ajax_f_removeAncestorTR(form) {
    form.parents("tr").hide("slow");
}
function ajax_f_disablesubmit(form) {
    $(form).find("input[type=submit]").attr("disabled", true);
}
function ajax_f_typeahead(form, input, inputval) {
    //something has changed on a monitored input
    //run a standard ajax function to get the list of typeahead options
    if (inputval.length > 2) {
        $(input).addClass('typeahead_getdata');
        //run ajax
        var typeaheadfile = '/api/typeahead/' + $(input).attr("name") + '.ajaxform?dir:referal=exclude';
        $.post(
            typeaheadfile,
            $(form).serialize(),
            function(data, status) {
                $(input).removeClass('typeahead_getdata');
                if (ajax_valid(data, status)) ajax_typeahead(form, input, inputval, data, status);
            },
            "json"
        );
    }
}

//misc ajax helpers
function ajax_typeahead(form, input, inputval, data, status) {
    var option, options = data.procxml.root.options;
    var typeahead_name  = 'typeahead_' + $(input).attr("name");
    var typeahead_div   = $('#' + typeahead_name);
    var typeahead_ul;

    //find or create the holding div
    if (typeahead_div.length) {
        //found it
        typeahead_ul = typeahead_div.find("ul");
        typeahead_ul.empty();
    } else {
        //create it
        $(input).wrap('<div id="' + typeahead_name + '" class="typeahead"></div>');
        $(input).after('<ul></ul>');
        typeahead_div   = $('#' + typeahead_name);
        typeahead_ul    = typeahead_div.find("ul");
        typeahead_ul.click(function(event){typeahead_select(typeahead_ul, form, input, event);});
        typeahead_ul.mouseover(function(event){typeahead_mouseover(typeahead_ul, form, input, event);});
        typeahead_div.keydown(function(event){typeahead_keydown(typeahead_ul, form, input, event);}); //to act before the form is submitted
    }

    //create options
    var html                        = '';
    var typeahead_custom_optionhtml = window[typeahead_name + '_optionhtml'];
    for (i in options) {
        option = options[i];
        if (typeahead_custom_optionhtml) html += typeahead_custom_optionhtml(option, i);
        else html += '<li>' + option + '</li>';
    }
    if (!html) html = '<li><span class="nooptions">no options found</span></li>';
    typeahead_ul.html(html);
    typeahead_ul.hide();
    typeahead_ul.slideDown("fast");
    $(input).focus();
}
function typeahead_select(typeahead_ul, form, input, event) {
    var target  = $(event.target);
    if (target.is("li")) {
        $(input).val(target.text());
        $(form).submit();
    }
}
function typeahead_mouseover(typeahead_ul, form, input, event) {
    var target  = $(event.target);
    var selected = typeahead_ul.find("li.selected");
    if (target.is("li")) {
        selected.removeClass("selected");
        target.addClass("selected");
    }
}
function typeahead_keydown(typeahead_ul, form, input, event) {
    var selected = typeahead_ul.find("li.selected");
    selected.removeClass("selected");
    switch (event.keyCode) {
        case 40: {//KEY_DOWN
            if (!selected.length) selected = typeahead_ul.children(":first");
            else selected = selected.next();
            break;
        }
        case 38: {//KEY_UP
            if (!selected.length) selected = typeahead_ul.children(":last");
            else selected = selected.prev();
            break;
        }
        case 13: {//KEY_ENTER
            if (selected.length) {
                $(input).val(selected.text());
                $(form).submit();
            }
            break;
        }
    }
    selected.addClass("selected");
    return false;
}

/*
Object.prototype.toString = function toString(level) {
    var item, datastring = '';
    if (!level) level = 0;
    var pad = '                                     '.substring(0, level*2);
    for (i in this) {
        item        = this[i];
        datastring += pad + i + ': ';
        if (item instanceof Object) datastring += '{\n' + item.toString(level + 1) + pad + '}\n';
        else datastring += item + '\n';
    }
    return datastring;
}
*/

var gScrolling = false;
function scrollIntoView(container, selector) {
    if (!gScrolling) {
        var currentScrollTop    = container.scrollTop();
        var containerTop        = container.offset().top;
        var containerHeight     = container.height();
        var targetScrollTop     = selector.offset().top                     - containerTop + currentScrollTop;
        var targetScrollBottom  = selector.offset().top + selector.height() - containerTop + currentScrollTop;
        if (targetScrollTop < currentScrollTop || targetScrollBottom > containerHeight + currentScrollTop) {
            gScrolling = true;
            container.animate({scrollTop: targetScrollTop}, 500, function(){gScrolling = false;});
        }
    }
}

function highlight_missing_links(jSelection) {
  jSelection.find("a").each(function(){
    var href = $(this).attr("href");
    var self = this;
    if (href && href != '#')
      $(this).get(
        href,
        null,
        function(data, status) {highlight_missing_links_reply(data, status, self);} //closure
      );
  });
}

function highlight_missing_links_reply(data, status, a) {
  alert($(a).attr("href") + ':' + status);
  $(a).addClass("brokenlink");
}

//sorting functions
function sortstart(e, ui) {
    ui.item.parent().parent().addClass('sort-active');
    $(document.body).addClass('sort-inactive');
    return true;
}
function resorted(e, ui) {
    ui.item.parent().parent().removeClass('sort-active');
    //ui.item.animate({backgroundColor:'#000000'}, 1000);
    $(document.body).removeClass('sort-inactive');
    return true;
}


//------------------------------- toggle --------------------------------------------
//arrays of expanded objects
var item_click_expanded                   = [],
    item_click_exclusive_sibling_expanded = [],
    item_hover_exclusive_global_expanded  = [];

var item_hover_exclusive_global_closing_timer;

//note that jQuery also supports merge and unique
Array.prototype.remove = function remove(me){
    var i = $.inArray(me, this);
    if (i != -1) this.splice(i,1);
    return i; //-1 if not found
}

function item_click(event) {
    var self = this;
    var targets = $(this).find('.item_contents:first').children();
    if (targets.filter(":hidden").length) {
        show_item.apply(this, [function(){$(self).trigger("expanded");}]);
        item_click_expanded.push(this);
    } else {
        hide_item.apply(this, [function(){$(self).trigger("compacted");}]);
        item_click_expanded.remove(this);
    }

    /* supress bubble up */
    if (event) event.stopImmediatePropagation();
    return false;
}

function item_click_exclusive_sibling(event) {
    //only one sibling can be expanded at a time (not global)
    var self = this;
    var targets = $(this).find('.item_contents:first').children();
    if (targets.filter(":hidden").length) {
        show_item.apply(this, [function(){$(self).trigger("expanded");}]);
        //close siblings
        $(this).siblings().each(function(){
            hide_item.apply(this);
            item_click_exclusive_sibling_expanded.remove(this);
        });
        item_click_exclusive_sibling_expanded.push(this);
    } else {
        hide_item.apply(this, [function(){$(self).trigger("compacted");}]);
        item_click_expanded.remove(this);
    }

    /* supress bubble up */
    event.stopImmediatePropagation();
    return false;
}

function item_hover_exclusive_global(event) {
    //global singular item_contents (hover over menus)
    //only show this if it is not already shown
    if ($.inArray(this, item_hover_exclusive_global_expanded) == -1) {
        var self = this;
        var targets = $(this).find('.item_contents:first').children();
        show_item.apply(this, [function(){$(self).trigger("expanded");}]);
        $(document.body).addClass("has-item-hover-exclusive-global-expanded");

        //close anything that is not an ancestor of this
        var elementtoclose, ancestor;
        for (var i = 0; i < item_hover_exclusive_global_expanded.length; i++) {
            ancestor       = this;
            elementtoclose = item_hover_exclusive_global_expanded[i];
            while (ancestor && ancestor != elementtoclose) ancestor = ancestor.parentNode;
            if (!ancestor) {
                hide_item.apply(elementtoclose);
                item_hover_exclusive_global_expanded.remove(elementtoclose);
            }
        }
        item_hover_exclusive_global_expanded.push(this);
    }
    if (item_hover_exclusive_global_closing_timer) clearTimeout(item_hover_exclusive_global_closing_timer); //prevent closing if in process

    /* supress bubble up */
    event.stopImmediatePropagation();
    return false;
}

//basic show_item hide toggle functionality
function show_item(fCallback) {
    var targets = $(this).find('.item_contents:first').children(":not(script)");
    var style   = 'slide';
    if ($(this).hasClass("item_fade")) style = 'fade';
    if ($(this).hasClass("item_fast")) style = 'fast';

    $(this).addClass("expanded");
    if (targets.filter(":hidden").length) {
        switch (style) {
          case 'fade': {targets.fadeIn(500, fCallback); break;} //"fast" = 200, "slow" = 600 milliseconds
          case 'fast': {targets.show(); break;}
          default: targets.slideDown("fast", fCallback);
        }
        targets.attr("compact", "compact"); //indicate compact
    }
    //hide the excluded contents (when expanded)
    targets = $(this).children('.item_contents_exclude').children();
    switch (style) {
      case 'fade': {targets.fadeOut(300); break;} //"fast" = 200, "slow" = 600 milliseconds
      case 'fast': {targets.hide(); break;}
      default: targets.slideUp("fast");
    }
    targets.attr("compact", "compact"); //indicate compact
    //change plus / minus
    var exp_img = $(this).find(".item_click_image");
    if (exp_img && exp_img.attr("src")) exp_img.attr("src", exp_img.attr("src").replace(/plus/gi, 'minus'));
}

function hide_item(fCallback) {
    var targets = $(this).find('.item_contents:first').children(":not(script)");
    var style   = 'slide';
    if ($(this).hasClass("item_fade")) style = 'fade';
    if ($(this).hasClass("item_fast")) style = 'fast';

    $(this).removeClass("expanded");
    if (targets.filter(":visible").length) {
        switch (style) {
          case 'fade': {targets.fadeOut(300, fCallback); break;} //"fast" = 200, "slow" = 600 milliseconds
          case 'fast': {targets.hide(); break;}
          default: targets.slideUp("fast", fCallback);
        }
        targets.removeAttr("compact");
    }
    //show the excluded contents (when collapsed)
    targets = $(this).find('.item_contents_exclude').children();
    switch (style) {
      case 'fade': {targets.fadeIn(500); break;} //"fast" = 200, "slow" = 600 milliseconds
      case 'fast': {targets.show(); break;}
      default: targets.slideDown("fast");
    }
    targets.removeAttr("compact"); //indicate compact
    //change plus / minus
    var exp_img = $(this).find(".item_click_image");
    if (exp_img && exp_img.attr("src")) exp_img.attr("src", exp_img.attr("src").replace(/minus/gi, 'plus'));
}

//global hide and show functions
function expandAll() {
    alert('not implemented');
}
function hideAll() {
    hideAll_item_click();
    hideAll_item_click_exclusive_sibling();
    hideAll_item_hover_exclusive_global();
}
function hideAll_item_click() {
  for (var i = 0; i < item_click_expanded.length; i++) hide_item.apply(item_click_expanded[i]);
  item_click_expanded = [];
}
function hideAll_item_click_exclusive_sibling() {
  for (var i = 0; i < item_click_exclusive_sibling_expanded.length; i++) hide_item.apply(item_click_exclusive_sibling_expanded[i]);
  item_click_exclusive_sibling_expanded = [];
}
function hideAll_item_hover_exclusive_global() {
  for (var i = 0; i < item_hover_exclusive_global_expanded.length; i++) hide_item.apply(item_hover_exclusive_global_expanded[i]);
  item_hover_exclusive_global_expanded = [];
  $(document.body).removeClass("has-item-hover-exclusive-global-expanded");
}

//setup
$(document).ready(function(){
    //attach the click events for show/hide
    $(".item_click").click(item_click);
    $(".item_click a").click(function(event){event.stopImmediatePropagation();});
    $(".item_click_exclusive_sibling").click(item_click_exclusive_sibling);
    $(".item_hover_exclusive_global").mouseover(item_hover_exclusive_global);

    //initially hide the expandable elements
    $(".item_click:not(.expanded), .item_click_exclusive_sibling, .item_hover_exclusive_global").find('.item_contents').children().hide();

    //hide all of the menus if the mouse is over the document or is clicked (IE fucks up the document.mouseover)
    $(document).click(hideAll_item_hover_exclusive_global);
    if (!window.isie) $(document).mouseover(function (){
        if (item_hover_exclusive_global_closing_timer) clearTimeout(item_hover_exclusive_global_closing_timer);
        item_hover_exclusive_global_closing_timer = setTimeout(hideAll_item_hover_exclusive_global, 1000);
    });

    //focus on the first visible textual input that has not asked not to be (comment blocks...)
    //do this after the toggle as it may hide stuff...
    var jFirstInput = $("input:text, textarea").filter(":enabled:not(:hidden)").filter(":not(.no_initialfocus, .no_initialfocus input:text, .no_initialfocus textarea)");
    if (jFirstInput.length) jFirstInput[0].focus(); //crashes IE if focus not possible
});


//------------------------------- GSObject --------------------------------------------
function GSObject(_jElement, _ClassFunction) {
  if (arguments.length) {
    //properties
    this.jElement      = _jElement;
    this.ClassFunction = _ClassFunction;
    this.xmlID         = this.jElement.attr("id");

    //init
    this.attachToObject();
  }
}

//default events
GSObject.prototype.click = function click(event) {
  var bPropogate = true;
  var fSpec = this.findCSSFunction(event, 'click');
  alert(this.xmlID);
  if (fSpec.found && this[fSpec.function]) bPropogate = this[fSpec.function].apply(this, fSpec.parameters);

  //propogation
  if (!bPropogate) event.stopPropagation();
  return bPropogate;
}
GSObject.prototype.click_f_ajaxShowChildren = function click_f_ajax_showChildren(sElementClass) {
  var self = this;
  var jChildren = this.jElement.find('.' + sElementClass);
  this.ajaxLoadChildren(jChildren, function(){self.ajaxLoadChildrenComplete(jChildren, show_item);});
  return false;
}
GSObject.prototype.click_f_ajaxToggle = function click_f_ajax_toggle(sElementClass) {
  var self = this;
  var jChildren = this.jElement.find('.' + sElementClass + ':first');
  this.ajaxLoadChildren(jChildren, function(){self.ajaxLoadChildrenComplete(jChildren, item_click);});
  return false;
}
GSObject.prototype.ajaxLoadChildren = function ajaxLoadChildren(jChildren, fCallback) {
  if (jChildren.attr("loaded") == "true") {
    //got em already, fCallback
    fCallback();
  } else {
    //set, load and fCallback
    jChildren.attr("loaded", "true");
    var sAjaxXpath = jChildren.find(".ajax_xpath").text();
    ajaxReplaceArea(jChildren, '/ajaxLoadChildren', {
      xmlID:this.xmlID,
      ajax_xpath:sAjaxXpath
    }, fCallback);
  }
}

GSObject.prototype.ajaxLoadChildrenComplete = function ajaxLoadChildrenComplete(jChildren, func) {
  GSObject.attachToObjects();
  if (func && window[func]) func.apply(jChildren.get(0));
}

GSObject.prototype.findCSSFunction = function findCSSFunction(event, sFuncPrefix) {
  var jCurrentBubble  = $(event.currentTarget);
  var jClickedElement = $(event.target);
  var jCheckElement   = jClickedElement;
  var aClasses, sClassname,
      bPropogate = true,
      bFound = false,
      aParameters = [];

  //recurse up the tree from the clicked element to the click event target
  //usually the jElement unless overridden
  //looking for functions click_f_*
  do {
    if (jCheckElement.attr("class")) {
      aClasses = jCheckElement.attr("class").split(' ');
      sClassname;

      //find the function to run
      for (var i = 0; i < aClasses.length && !bFound; i++) {
        sClassname = aClasses[i];
        if (sClassname.substr(0, sFuncPrefix.length + 3) == sFuncPrefix + '_f_') bFound = true;
      }
    }

    jCheckElement = jCheckElement.parent();
  } while (!bFound && jCheckElement.length && jCheckElement != jCurrentBubble);


  if (bFound) {
    //function name
    sFuncName = sClassname.match(/^.*_f_[^_]+/)[0];

    //parameters
    for (var i = 0; i < aClasses.length; i++) {
      sClassname = aClasses[i];
      if (sClassname.substr(0, sFuncName.length) == sFuncName) {
        aParameters.push(sClassname.substr(sFuncName.length + 1));
      }
    }
  }

  //call object
  ret = {'found':      bFound,
         'element':    jCheckElement,
         'function':   sFuncName,
         'parameters': aParameters
  };

  return ret;
}

//attachment
GSObject.classes = new Object();
GSObject.prototype.attachToObject = function attachToObject() {
  var self = this;
  this.jElement.click(function (event) {return self.click(event);});
}

//static
GSObject.attachToObjects = function attachToObjects() {
  for (className in GSObject.classes) {
    var ClassFunction = GSObject.classes[className];
    var sCSSTerm      = '.' + className + ':not(.gs_attached)';
    var jObjects      = $(sCSSTerm);
    var classObject;

    //alert(document.location + ':\n' + sCSSTerm + ':' + jObjects.length);
    jObjects.each(function () {
      classObject = new ClassFunction($(this), ClassFunction);
      $(this).addClass('gs_attached');
    });
  }
}
GSObject.register = function register(ClassFunction) {
  GSObject.classes[ClassFunction.className] = ClassFunction;
}

//init
$(document).ready(function() {
  setTimeout(GSObject.attachToObjects, 1000);
});

//-->