
YAHOO.namespace("tool");YAHOO.tool.TestLogger=function(element,config){arguments.callee.superclass.constructor.call(this,element,config);this.init();};YAHOO.lang.extend(YAHOO.tool.TestLogger,YAHOO.widget.LogReader,{footerEnabled:true,newestOnTop:false,formatMsg:function(message){var category=message.category;var text=this.html2Text(message.msg);return"<pre><p><span class=\""+category+"\">"+category.toUpperCase()+"</span> "+text+"</p></pre>";},init:function(){YAHOO.tool.TestRunner.subscribe("pass",this.handlePass,this,true);YAHOO.tool.TestRunner.subscribe("fail",this.handleFail,this,true);YAHOO.tool.TestRunner.subscribe("ignore",this.handleIgnore,this,true);YAHOO.tool.TestRunner.subscribe("testsuitebegin",this.handleTestSuiteBegin,this,true);YAHOO.tool.TestRunner.subscribe("testsuitecomplete",this.handleTestSuiteComplete,this,true);YAHOO.tool.TestRunner.subscribe("testcasebegin",this.handleTestCaseBegin,this,true);YAHOO.tool.TestRunner.subscribe("testcasecomplete",this.handleTestCaseComplete,this,true);YAHOO.widget.Logger.reset();},handleFail:function(data){YAHOO.log(data.testName+": "+data.error.getMessage(),"fail");},handleIgnore:function(data){YAHOO.log(data.testName+": ignored","ignore");},handlePass:function(data){YAHOO.log(data.testName+": passed","pass");},handleTestSuiteBegin:function(data){var testSuiteName=data.testSuite.name||"Unnamed test suite";YAHOO.log("Test suite \""+testSuiteName+"\" started","info");},handleTestSuiteComplete:function(data){var testSuiteName=data.testSuite.name||"Unnamed test suite";YAHOO.log("Test suite \""+testSuiteName+"\" completed","info");},handleTestCaseBegin:function(data){var testCaseName=data.testCase.name||"Unnamed test case";YAHOO.log("Test case \""+testCaseName+"\" started","info");},handleTestCaseComplete:function(data){var testCaseName=data.testCase.name||"Unnamed test case";YAHOO.log("Test case \""+testCaseName+"\" completed. Passed:"+data.results.passed+" Failed:"+data.results.failed+" Total:"+data.results.total,"info");}});YAHOO.namespace("tool");YAHOO.tool.TestRunner=(function(){function TestRunner(){this.constructor.superclass.constructor.apply(this,arguments);this.items=[];this.createEvent("testcasebegin",{scope:this});this.createEvent("testcasecomplete",{scope:this});this.createEvent("testsuitebegin",{scope:this});this.createEvent("testsuitecomplete",{scope:this});this.createEvent("pass",{scope:this});this.createEvent("fail",{scope:this});this.createEvent("ignore",{scope:this});this.createEvent("complete",{scope:this});}
YAHOO.lang.extend(TestRunner,YAHOO.util.EventProvider,{runTestCase:function(testCase){var results={};this.fireEvent("testcasebegin",{testCase:testCase});var tests=[];for(var prop in testCase){if(prop.indexOf("test")===0&&typeof testCase[prop]=="function"){tests.push(prop);}}
var shouldFail=testCase._should.fail||{};var shouldError=testCase._should.error||{};var shouldIgnore=testCase._should.ignore||{};var failCount=0;var passCount=0;var runCount=0;for(var i=0;i<tests.length;i++){if(shouldIgnore[tests[i]]){this.fireEvent("ignore",{testCase:testCase,testName:tests[i]});continue;}
var failed=false;var error=null;testCase.setUp();try{testCase[tests[i]]();if(shouldFail[tests[i]]){error=new YAHOO.util.ShouldFail();failed=true;}else if(shouldError[tests[i]]){error=new YAHOO.util.ShouldError();failed=true;}}catch(thrown){if(thrown instanceof YAHOO.util.AssertionError){if(!shouldFail[tests[i]]){error=thrown;failed=true;}}else{if(!shouldError[tests[i]]){error=new YAHOO.util.UnexpectedError(thrown);failed=true;}}}finally{if(failed){this.fireEvent("fail",{testCase:testCase,testName:tests[i],error:error});}else{this.fireEvent("pass",{testCase:testCase,testName:tests[i]});}}
testCase.tearDown();results[tests[i]]={result:failed?"fail":"pass",message:error?error.getMessage():"Test passed"};runCount++;failCount+=(failed?1:0);passCount+=(failed?0:1);}
results.total=runCount;results.failed=failCount;results.passed=passCount;this.fireEvent("testcasecomplete",{testCase:testCase,results:results});return results;},runTestSuite:function(testSuite){var results={};this.fireEvent("testsuitebegin",{testSuite:testSuite});for(var i=0;i<testSuite.items.length;i++){if(testSuite.items[i]instanceof YAHOO.tool.TestSuite){results[testSuite.items[i].name]=this.runTestSuite(testSuite.items[i]);}else if(testSuite.items[i]instanceof YAHOO.tool.TestCase){results[testSuite.items[i].name]=this.runTestCase(testSuite.items[i]);}}
this.fireEvent("testsuitecomplete",{testSuite:testSuite,results:results});return results;},add:function(testObject){this.items.push(testObject);},clear:function(){while(this.items.length){this.items.pop();}},run:function(testObject){var results=null;if(testObject instanceof YAHOO.tool.TestSuite){results=this.runTestSuite(testObject);}else if(testObject instanceof YAHOO.tool.TestCase){results=this.runTestCase(testObject);}else if(arguments.length===0){results={};for(var i=0;i<this.items.length;i++){results[this.items[i].name]=this.run(this.items[i]);}}else{throw new TypeError("Expected either YAHOO.util.TestCase or YAHOO.util.TestSuite.");}
this.fireEvent("complete",{results:results});}});return new TestRunner();})();YAHOO.namespace("tool");YAHOO.tool.TestSuite=function(name){this.name=name||YAHOO.util.Dom.generateId(null,"testSuite");this.items=[];};YAHOO.tool.TestSuite.prototype={add:function(testObject){if(testObject instanceof YAHOO.tool.TestSuite||testObject instanceof YAHOO.tool.TestCase){this.items.push(testObject);}}};YAHOO.namespace("tool");YAHOO.tool.TestCase=function(template){this._should={};for(var prop in template){this[prop]=template[prop];}
if(!YAHOO.lang.isString(this.name)){this.name=YAHOO.util.Dom.generateId(null,"testCase");}};YAHOO.tool.TestCase.prototype={setUp:function(){},tearDown:function(){}};YAHOO.namespace("util");YAHOO.util.Assert={fail:function(message){throw new YAHOO.util.AssertionError(message||"Test force-failed.");},areEqual:function(expected,actual,message){if(expected!=actual){throw new YAHOO.util.ComparisonFailure(message||"Values should be equal.",expected,actual);}},areNotEqual:function(unexpected,actual,message){if(unexpected==actual){throw new YAHOO.util.UnexpectedValue(message||"Values should not be equal.",unexpected);}},areNotSame:function(unexpected,actual,message){if(unexpected===actual){throw new YAHOO.util.UnexpectedValue(message||"Values should not be the same.",unexpected);}},areSame:function(expected,actual,message){if(expected!==actual){throw new YAHOO.util.ComparisonFailure(message||"Values should be the same.",expected,actual);}},isFalse:function(actual,message){if(false!==actual){throw new YAHOO.util.ComparisonFailure(message||"Value should be false.",false,actual);}},isTrue:function(actual,message){if(true!==actual){throw new YAHOO.util.ComparisonFailure(message||"Value should be true.",true,actual);}},isNaN:function(actual,message){if(!isNaN(actual)){throw new YAHOO.util.ComparisonFailure(message||"Value should be NaN.",NaN,actual);}},isNotNaN:function(actual,message){if(isNaN(actual)){throw new YAHOO.util.UnexpectedValue(message||"Values should not be NaN.",NaN);}},isNotNull:function(actual,message){if(YAHOO.lang.isNull(actual)){throw new YAHOO.util.UnexpectedValue(message||"Values should not be null.",null);}},isNotUndefined:function(actual,message){if(YAHOO.lang.isUndefined(actual)){throw new YAHOO.util.UnexpectedValue(message||"Value should not be undefined.",undefined);}},isNull:function(actual,message){if(!YAHOO.lang.isNull(actual)){throw new YAHOO.util.ComparisonFailure(message||"Value should be null.",null,actual);}},isUndefined:function(actual,message){if(!YAHOO.lang.isUndefined(actual)){throw new YAHOO.util.ComparisonFailure(message||"Value should be undefined.",undefined,actual);}},isArray:function(actual,message){if(!YAHOO.lang.isArray(actual)){throw new YAHOO.util.UnexpectedValue("Value should be an array.",actual);}},isBoolean:function(actual,message){if(!YAHOO.lang.isBoolean(actual)){throw new YAHOO.util.UnexpectedValue("Value should be a Boolean.",actual);}},isFunction:function(actual,message){if(!YAHOO.lang.isFunction(actual)){throw new YAHOO.util.UnexpectedValue("Value should be a function.",actual);}},isInstanceOf:function(expected,actual,message){if(!(actual instanceof expected)){throw new YAHOO.util.ComparisonFailure(message||"Value isn't an instance of expected type.",expected,actual);}},isNumber:function(actual,message){if(!YAHOO.lang.isNumber(actual)){throw new YAHOO.util.UnexpectedValue("Value should be a number.",actual);}},isObject:function(actual,message){if(!YAHOO.lang.isObject(actual)){throw new YAHOO.util.UnexpectedValue("Value should be an object.",actual);}},isString:function(actual,message){if(!YAHOO.lang.isString(actual)){throw new YAHOO.util.UnexpectedValue("Value should be a string.",actual);}},isTypeOf:function(expectedType,actualValue,message){if(typeof actualValue!=expectedType){throw new YAHOO.util.ComparisonFailure(message||"Value should be of type "+expected+".",expected,typeof actual);}}};YAHOO.util.AssertionError=function(message){arguments.callee.superclass.constructor.call(this,message);this.message=message;this.name="AssertionError";};YAHOO.lang.extend(YAHOO.util.AssertionError,Error,{getMessage:function(){return this.message;},toString:function(){return this.name+": "+this.getMessage();},valueOf:function(){return this.toString();}});YAHOO.util.ComparisonFailure=function(message,expected,actual){arguments.callee.superclass.constructor.call(this,message);this.expected=expected;this.actual=actual;this.name="ComparisonFailure";};YAHOO.lang.extend(YAHOO.util.ComparisonFailure,YAHOO.util.AssertionError,{getMessage:function(){return this.message+"\nExpected: "+this.expected+" ("+(typeof this.expected)+")"+"\nActual:"+this.actual+" ("+(typeof this.actual)+")";}});YAHOO.util.UnexpectedValue=function(message,unexpected){arguments.callee.superclass.constructor.call(this,message);this.unexpected=unexpected;this.name="UnexpectedValue";};YAHOO.lang.extend(YAHOO.util.UnexpectedValue,YAHOO.util.AssertionError,{getMessage:function(){return this.message+"\nUnexpected: "+this.unexpected+" ("+(typeof this.unexpected)+") ";}});YAHOO.util.ShouldFail=function(message){arguments.callee.superclass.constructor.call(this,message||"This test should fail but didn't.");this.name="ShouldFail";};YAHOO.lang.extend(YAHOO.util.ShouldFail,YAHOO.util.AssertionError);YAHOO.util.ShouldError=function(message){arguments.callee.superclass.constructor.call(this,message||"This test should have thrown an error but didn't.");this.name="ShouldError";};YAHOO.lang.extend(YAHOO.util.ShouldError,YAHOO.util.AssertionError);YAHOO.util.UnexpectedError=function(cause){arguments.callee.superclass.constructor.call(this,"Unexpected error: "+cause.message);this.cause=cause;this.name="UnexpectedError";};YAHOO.lang.extend(YAHOO.util.UnexpectedError,YAHOO.util.AssertionError);YAHOO.util.ArrayAssert={contains:function(needle,haystack,message){var found=false;for(var i=0;i<haystack.length&&!found;i++){if(haystack[i]===needle){found=true;}}
if(!found){throw new YAHOO.util.AssertionError(message||"Value not found in array.");}},itemsAreEqual:function(expected,actual,message){var len=Math.max(expected.length,actual.length);for(var i=0;i<len;i++){YAHOO.util.Assert.areEqual(expected[i],actual[i],message||"Values in position "+i+" are not equal.");}},isEmpty:function(actual,message){if(actual.length>0){throw new YAHOO.util.AssertionError(message||"Array should be empty.");}},isNotEmpty:function(actual,message){if(actual.length===0){throw new YAHOO.util.AssertionError(message||"Array should not be empty.");}},itemsAreSame:function(expected,actual,message){var len=Math.max(expected.length,actual.length);for(var i=0;i<len;i++){YAHOO.util.Assert.areSame(expected[i],actual[i],message||"Values in position "+i+" are not the same.");}}};YAHOO.namespace("util");YAHOO.util.ObjectAssert={containsKey:function(key,object,message){if(YAHOO.lang.isUndefined(object[key])){throw new YAHOO.util.AssertionError(message||"Property "+key+" not found in object.");}},keysAreEqual:function(expected,actual,message){var keys=[];for(var key in expected){keys.push(key);}
for(var i=0;i<keys.length;i++){YAHOO.util.Assert.isNotUndefined(actual[keys[i]],message||"Key '"+key+"' expected.");}}};YAHOO.namespace("util");YAHOO.util.UserAction={fireKeyEvent:function(type,target,options){var event=null;options=options||{};target=YAHOO.util.Dom.get(target);if(YAHOO.lang.isFunction(document.createEvent)){if(!YAHOO.lang.isUndefined(window.KeyEvent)){event=document.createEvent("KeyEvents");event.initKeyEvent(type,true,true,window,options.ctrlKey||false,options.altKey||false,options.shiftKey||false,options.metaKey||false,options.keyCode||0,options.charCode||0);}else{event=document.createEvent("UIEvents");event.initUIEvent(type,true,true,window,1);event.keyCode=options.keyCode||0;event.altKey=options.altKey||false;event.ctrlKey=options.ctrlKey||false;event.shiftKey=options.shiftKey||false;event.metaKey=options.metaKey||false;event.charCode=options.charCode||0;}
target.dispatchEvent(event);}else if(YAHOO.lang.isObject(document.createEventObject)){event=document.createEventObject();event.ctrlKey=options.ctrlKey||false;event.altKey=options.AltKey||false;event.shiftKey=options.shiftKey||false;event.metaKey=options.metaKey||false;event.keyCode=options.keyCode|options.charCode||0;target.fireEvent("on"+type,event);}else{throw new Error("Could not fire event '"+type+"'.");}},fireMouseEvent:function(type,target,options){var event=null;options=options||{};target=YAHOO.util.Dom.get(target);if(YAHOO.lang.isFunction(document.createEvent)){event=document.createEvent("MouseEvents");if(YAHOO.lang.isFunction(event.initMouseEvent)){event.initMouseEvent(type,true,true,window,null,options.screenX||0,options.screenY||0,options.clientX||0,options.clientY||0,options.ctrlKey||false,options.altKey||false,options.shiftKey||false,options.metaKey||false,options.button||0,options.relatedTarget);}else if(YAHOO.lang.isFunction(event.initEvent)){event=document.createEvent("UIEvents");event.initEvent(type,true,true);event.screenX=options.screenX||0;event.screenY=options.screenY||0;event.clientX=options.clientX||0;event.clientY=options.clientY||0;event.altKey=options.altKey||false;event.ctrlKey=options.ctrlKey||false;event.metaKey=options.metaKey||false;event.shiftKey=options.shiftKey||false;event.relatedTarget=options.relatedTarget;}
if(options.relatedTarget&&!event.relatedTarget){if(type=="mouseout"){event.toElement=options.relatedTarget;}else if(type=="mouseover"){event.fromElement=options.relatedTarget;}}
target.dispatchEvent(event);}else if(YAHOO.lang.isObject(document.createEventObject)){event=document.createEventObject();event.screenX=options.screenX||0;event.screenY=options.screenY||0;event.clientX=options.clientX||0;event.clientY=options.clientY||0;event.altKey=options.altKey||false;event.ctrlKey=options.ctrlKey||false;event.metaKey=options.metaKey||false;event.shiftKey=options.shiftKey||false;event.relatedTarget=options.relatedTarget;switch(options.button){case 0:event.button=1;break;case 1:event.button=4;break;default:event.button=0;}
target.fireEvent("on"+type,event);}else{throw new Error("Could not fire event '"+type+"'.");}},click:function(target,options){this.fireMouseEvent("click",target,options);},dblclick:function(target,options){this.fireMouseEvent("click",target,options);},mousedown:function(target,options){this.fireMouseEvent("mousedown",target,options);},mousemove:function(target,options){this.fireMouseEvent("mousemove",target,options);},mouseout:function(target,options){this.fireMouseEvent("mouseout",target,options);},mouseover:function(target,options){this.fireMouseEvent("mouseover",target,options);},mouseup:function(target,options){this.fireMouseEvent("mouseup",target,options);},keydown:function(target,options){this.fireKeyEvent("keydown",target,options);},keypress:function(target,options){this.fireKeyEvent("keypress",target,options);},keyup:function(target,options){this.fireKeyEvent("keyup",target,options);}};YAHOO.register("yuitest",YAHOO.tool.TestRunner,{version:"@VERSION@",build:"@BUILD@"});