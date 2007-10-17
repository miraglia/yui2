/**
 * @module simpleeditor
 * @description <p>The Rich Text Editor is a UI control that replaces a standard HTML textarea; it allows for the rich formatting of text content, including common structural treatments like lists, formatting treatments like bold and italic text, and drag-and-drop inclusion and sizing of images. The Rich Text Editor's toolbar is extensible via a plugin architecture so that advanced implementations can achieve a high degree of customization.</p>
 * @namespace YAHOO.widget
 * @requires yahoo, dom, element, event, toolbar
 * @optional animation, container_core
 * @beta
 */

(function() {
var Dom = YAHOO.util.Dom,
    Event = YAHOO.util.Event,
    Lang = YAHOO.lang,
    Toolbar = YAHOO.widget.Toolbar;

    /**
     * The Rich Text Editor is a UI control that replaces a standard HTML textarea; it allows for the rich formatting of text content, including common structural treatments like lists, formatting treatments like bold and italic text, and drag-and-drop inclusion and sizing of images. The Rich Text Editor's toolbar is extensible via a plugin architecture so that advanced implementations can achieve a high degree of customization.
     * @constructor
     * @class SimpleEditor
     * @extends YAHOO.util.Element
     * @param {String/HTMLElement} el The textarea element to turn into an editor.
     * @param {Object} attrs Object liternal containing configuration parameters.
    */
    
    YAHOO.widget.SimpleEditor = function(el, attrs) {
        YAHOO.log('SimpleEditor Initalizing', 'info', 'SimpleEditor');

        var oConfig = {
            element: null,
            attributes: (attrs || {})
        }, id = null;

        if (Lang.isString(el)) {
            id = el;
        } else {
            id = el.id;
        }
        oConfig.element = el;

        var element_cont = document.createElement('DIV');
        oConfig.attributes.element_cont = new YAHOO.util.Element(element_cont, {
            id: id + '_container'
        });
        var div = document.createElement('div');
        Dom.addClass(div, 'first-child');
        oConfig.attributes.element_cont.appendChild(div);
        
        if (!oConfig.attributes.toolbar_cont) {
            oConfig.attributes.toolbar_cont = document.createElement('DIV');
            oConfig.attributes.toolbar_cont.id = id + '_toolbar';
            div.appendChild(oConfig.attributes.toolbar_cont);
        }
        var editorWrapper = document.createElement('DIV');
        div.appendChild(editorWrapper);
        oConfig.attributes.editor_wrapper = editorWrapper;

        YAHOO.widget.SimpleEditor.superclass.constructor.call(this, oConfig.element, oConfig.attributes);
    };

    /**
    * @private _cleanClassName
    * @description Makes a useable classname from dynamic data, by dropping it to lowercase and replacing spaces with -'s.
    * @param {String} str The classname to clean up
    * @returns {String}
    */
    function _cleanClassName(str) {
        return str.replace(/ /g, '-').toLowerCase();
    }


    YAHOO.extend(YAHOO.widget.SimpleEditor, YAHOO.util.Element, {
        /**
        * @property editorDirty
        * @description This flag will be set when certain things in the Editor happen. It is to be used by the developer to check to see if content has changed.
        * @type Boolean
        */
        editorDirty: false,
        /**
        * @property _defaultToolbar
        * @private
        * @description Default toolbar config.
        * @type Object
        */
        _defaultToolbar: {
            collapse: true,
            titlebar: 'Text Editing Tools',
            draggable: false,
            buttons: [
                { group: 'fontstyle', label: 'Font Name and Size',
                    buttons: [
                        { type: 'select', label: 'Arial', value: 'fontname', disabled: true,
                            menu: [
                                { text: 'Arial', checked: true },
                                { text: 'Arial Black' },
                                { text: 'Comic Sans MS' },
                                { text: 'Courier New' },
                                { text: 'Lucida Console' },
                                { text: 'Tahoma' },
                                { text: 'Times New Roman' },
                                { text: 'Trebuchet MS' },
                                { text: 'Verdana' }
                            ]
                        },
                        { type: 'spin', label: '13', value: 'fontsize', range: [ 9, 75 ], disabled: true }
                    ]
                },
                { type: 'separator' },
                { group: 'textstyle', label: 'Font Style',
                    buttons: [
                        { type: 'push', label: 'Bold CTRL + SHIFT + B', value: 'bold' },
                        { type: 'push', label: 'Italic CTRL + SHIFT + I', value: 'italic' },
                        { type: 'push', label: 'Underline CTRL + SHIFT + U', value: 'underline' }
                    ]
                },
                { type: 'separator' },
                { group: 'indentlist', label: 'Lists',
                    buttons: [
                        { type: 'push', label: 'Create an Unordered List', value: 'insertunorderedlist' },
                        { type: 'push', label: 'Create an Ordered List', value: 'insertorderedlist' }
                    ]
                },
                { type: 'separator' },
                { group: 'insertitem', label: 'Insert Item',
                    buttons: [
                        { type: 'push', label: 'HTML Link CTRL + SHIFT + L', value: 'createlink', disabled: true },
                        { type: 'push', label: 'Insert Image', value: 'insertimage' }
                    ]
                }
            ]
        },
        /**
        * @property _lastButton
        * @private
        * @description The last button pressed, so we don't disable it.
        * @type Object
        */
        _lastButton: null,
        /**
        * @property _baseHREF
        * @private
        * @description The base location of the editable page (this page) so that relative paths for image work.
        * @type String
        */
        _baseHREF: function() {
            var href = document.location.href;
            if (href.indexOf('?') !== -1) { //Remove the query string
                href = href.substring(0, href.indexOf('?'));
            }
            href = href.substring(0, href.lastIndexOf('/')) + '/';
            return href;
        }(),
        /**
        * @property _lastImage
        * @private
        * @description Safari reference for the last image selected (for styling as selected).
        * @type HTMLElement
        */
        _lastImage: null,
        /**
        * @property _blankImageLoaded
        * @private
        * @description Don't load the blank image more than once..
        * @type Date
        */
        _blankImageLoaded: false,
        /**
        * @property _fixNodesTimer
        * @private
        * @description Holder for the fixNodes timer
        * @type Date
        */
        _fixNodesTimer: null,
        /**
        * @property _nodeChangeTimer
        * @private
        * @description Holds a reference to the nodeChange setTimeout call
        * @type Number
        */
        _nodeChangeTimer: null,
        /**
        * @property _lastNodeChangeEvent
        * @private
        * @description Flag to determine the last event that fired a node change
        * @type Event
        */
        _lastNodeChangeEvent: null,
        /**
        * @property _lastNodeChange
        * @private
        * @description Flag to determine when the last node change was fired
        * @type Date
        */
        _lastNodeChange: 0,
        /**
        * @property _rendered
        * @private
        * @description Flag to determine if editor has been rendered or not
        * @type Boolean
        */
        _rendered: false,
        /**
        * @property DOMReady
        * @private
        * @description Flag to determine if DOM is ready or not
        * @type Boolean
        */
        DOMReady: null,
        /**
        * @property _selection
        * @private
        * @description Holder for caching iframe selections
        * @type Object
        */
        _selection: null,
        /**
        * @property _mask
        * @private
        * @description DOM Element holder for the editor Mask when disabled
        * @type Object
        */
        _mask: null,
        /**
        * @property _showingHiddenElements
        * @private
        * @description Status of the hidden elements button
        * @type Boolean
        */
        _showingHiddenElements: null,
        /**
        * @property currentWindow
        * @description A reference to the currently open EditorWindow
        * @type Object
        */
        currentWindow: null,
        /**
        * @property currentEvent
        * @description A reference to the current editor event
        * @type Event
        */
        currentEvent: null,
        /**
        * @property operaEvent
        * @private
        * @description setTimeout holder for Opera and Image DoubleClick event..
        * @type Object
        */
        operaEvent: null,
        /**
        * @property currentFont
        * @description A reference to the last font selected from the Toolbar
        * @type HTMLElement
        */
        currentFont: null,
        /**
        * @property currentElement
        * @description A reference to the current working element in the editor
        * @type Array
        */
        currentElement: [],
        /**
        * @property dompath
        * @description A reference to the dompath container for writing the current working dom path to.
        * @type HTMLElement
        */
        dompath: null,
        /**
        * @property beforeElement
        * @description A reference to the H2 placed before the editor for Accessibilty.
        * @type HTMLElement
        */
        beforeElement: null,
        /**
        * @property afterElement
        * @description A reference to the H2 placed after the editor for Accessibilty.
        * @type HTMLElement
        */
        afterElement: null,
        /**
        * @property invalidHTML
        * @description Contains a list of HTML elements that are invalid inside the editor. They will be removed when they are found.
        * @type Object
        */
        invalidHTML: {
            form: true,
            input: true,
            button: true,
            select: true,
            link: true,
            html: true,
            body: true,
            script: true,
            style: true,
            textarea: true
        },
        /**
        * @property toolbar
        * @description Local property containing the <a href="YAHOO.widget.Toolbar.html">YAHOO.widget.Toolbar</a> instance
        * @type <a href="YAHOO.widget.Toolbar.html">YAHOO.widget.Toolbar</a>
        */
        toolbar: null,
        /**
        * @private
        * @property _contentTimer
        * @description setTimeout holder for documentReady check
        */
        _contentTimer: null,
        /**
        * @private
        * @property _contentTimerCounter
        * @description Counter to check the number of times the body is polled for before giving up
        * @type Number
        */
        _contentTimerCounter: 0,
        /**
        * @private
        * @property _disabled
        * @description The Toolbar items that should be disabled if there is no selection present in the editor.
        * @type Array
        */
        _disabled: [ 'createlink', 'fontname', 'fontsize' ],
        /**
        * @private
        * @property _alwaysDisabled
        * @description The Toolbar items that should ALWAYS be disabled event if there is a selection present in the editor.
        * @type Object
        */
        _alwaysDisabled: { },
        /**
        * @private
        * @property _alwaysEnabled
        * @description The Toolbar items that should ALWAYS be enabled event if there isn't a selection present in the editor.
        * @type Object
        */
        _alwaysEnabled: { },
        /**
        * @private
        * @property _semantic
        * @description The Toolbar commands that we should attempt to make tags out of instead of using styles.
        * @type Object
        */
        _semantic: { 'bold': true, 'italic' : true, 'underline' : true },
        /**
        * @private
        * @property _tag2cmd
        * @description A tag map of HTML tags to convert to the different types of commands so we can select the proper toolbar button.
        * @type Object
        */
        _tag2cmd: {
            'b': 'bold',
            'strong': 'bold',
            'i': 'italic',
            'em': 'italic',
            'u': 'underline',
            'sup': 'superscript',
            'sub': 'subscript',
            'img': 'insertimage',
            'a' : 'createlink',
            'ul' : 'insertunorderedlist',
            'ol' : 'insertorderedlist'
        },

        /**
        * @private _createIframe
        * @description Creates the DOM and YUI Element for the iFrame editor area.
        * @param {String} id The string ID to prefix the iframe with
        * @returns {Object} iFrame object
        */
        _createIframe: function() {
            var ifrmDom = document.createElement('iframe');
            ifrmDom.id = this.get('id') + '_editor';
            var config = {
                border: '0',
                frameBorder: '0',
                marginWidth: '0',
                marginHeight: '0',
                leftMargin: '0',
                topMargin: '0',
                allowTransparency: 'true',
                width: '100%'
            };
            for (var i in config) {
                if (Lang.hasOwnProperty(config, i)) {
                    ifrmDom.setAttribute(i, config[i]);
                }
            }
            var isrc = 'javascript:;';
            if (this.browser.ie) {
                isrc = 'about:blank';
            }
            ifrmDom.setAttribute('src', isrc);
            var ifrm = new YAHOO.util.Element(ifrmDom);
            ifrm.setStyle('zIndex', '-1');
            return ifrm;
        },
        /**
        * @private _isElement
        * @description Checks to see if an Element reference is a valid one and has a certain tag type
        * @param {HTMLElement} el The element to check
        * @param {String} tag The tag that the element needs to be
        * @returns {Boolean}
        */
        _isElement: function(el, tag) {
            if (el && el.tagName && (el.tagName.toLowerCase() == tag)) {
                return true;
            }
            if (el && el.getAttribute && (el.getAttribute('tag') == tag)) {
                return true;
            }
            return false;
        },
        /**
        * @private
        * @method _getDoc
        * @description Get the Document of the IFRAME
        * @return {Object}
        */
        _getDoc: function() {
            var value = false;
            if (this.get) {
                if (this.get('iframe')) {
                    if (this.get('iframe').get) {
                        if (this.get('iframe').get('element')) {
                            try {
                                if (this.get('iframe').get('element').contentWindow) {
                                    if (this.get('iframe').get('element').contentWindow.document) {
                                        value = this.get('iframe').get('element').contentWindow.document;
                                        return value;
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
            return false;
        },
        /**
        * @private
        * @method _getWindow
        * @description Get the Window of the IFRAME
        * @return {Object}
        */
        _getWindow: function() {
            return this.get('iframe').get('element').contentWindow;
        },
        /**
        * @private
        * @method _focusWindow
        * @description Attempt to set the focus of the iframes window.
        * @param {Boolean} onLoad Safari needs some special care to set the cursor in the iframe
        */
        _focusWindow: function(onLoad) {
            if (this.browser.webkit) {
                if (onLoad) {
                    /**
                    * @knownissue Safari Cursor Position
                    * @browser Safari 2.x
                    * @description Can't get Safari to place the cursor at the beginning of the text..
                    * This workaround at least set's the toolbar into the proper state.
                    */
                    this._getSelection().setBaseAndExtent(this._getDoc().body.firstChild, 0, this._getDoc().body.firstChild, 1);
                    if (this.browser.webkit3) {
                        this._getSelection().collapseToStart();
                    } else {
                        this._getSelection().collapse(false);
                    }
                } else {
                    this._getSelection().setBaseAndExtent(this._getDoc().body, 1, this._getDoc().body, 1);
                    if (this.browser.webkit3) {
                        this._getSelection().collapseToStart();
                    } else {
                        this._getSelection().collapse(false);
                    }
                }
                this._getWindow().focus();
            } else {
                this._getWindow().focus();
            }
        },
        /**
        * @private
        * @method _hasSelection
        * @description Determines if there is a selection in the editor document.
        * @returns {Boolean}
        */
        _hasSelection: function() {
            var sel = this._getSelection();
            var range = this._getRange();
            var hasSel = false;

            //Internet Explorer
            if (this.browser.ie || this.browser.opera) {
                if (range.text) {
                    hasSel = true;
                }
                if (range.html) {
                    hasSel = true;
                }
            } else {
                if (this.browser.webkit) {
                    if (sel+'' !== '') {
                        hasSel = true;
                    }
                } else {
                    if (sel && (sel.toString() !== '') && (sel !== undefined)) {
                        hasSel = true;
                    }
                }
            }
            return hasSel;
        },
        /**
        * @private
        * @method _getSelection
        * @description Handles the different selection objects across the A-Grade list.
        * @returns {Object} Selection Object
        */
        _getSelection: function() {
            var _sel = null;
            if (this._getDoc() && this._getWindow()) {
                if (this._getDoc().selection) {
                    _sel = this._getDoc().selection;
                } else {
                    _sel = this._getWindow().getSelection();
                }
                //Handle Safari's lack of Selection Object
                if (this.browser.webkit) {
                    if (_sel.baseNode) {
                            this._selection = {};
                            this._selection.baseNode = _sel.baseNode;
                            this._selection.baseOffset = _sel.baseOffset;
                            this._selection.extentNode = _sel.extentNode;
                            this._selection.extentOffset = _sel.extentOffset;
                    } else if (this._selection !== null) {
                        _sel = this._getWindow().getSelection();
                        _sel.setBaseAndExtent(
                            this._selection.baseNode,
                            this._selection.baseOffset,
                            this._selection.extentNode,
                            this._selection.extentOffset);
                        this._selection = null;
                    }
                }
            }
            return _sel;
        },
        /**
        * @private
        * @method _selectNode
        * @description Places the highlight around a given node
        * @param {HTMLElement} node The node to select
        */
        _selectNode: function(node) {
            if (!node) {
                return false;
            }
            var sel = this._getSelection(),
                range = null;

            if (this.browser.ie) {
                try { //IE freaks out here sometimes..
                    range = this.getDoc().body.createTextRange();
                    range.moveToElementText(node);
                    range.select();
                } catch (e) {}
            } else if (this.browser.webkit) {
				sel.setBaseAndExtent(node, 0, node, node.innerText.length);
            } else {
                range = this._getDoc().createRange();
                range.selectNodeContents(node);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        },
        /**
        * @private
        * @method _getRange
        * @description Handles the different range objects across the A-Grade list.
        * @returns {Object} Range Object
        */
        _getRange: function() {
            var sel = this._getSelection();

            if (sel === null) {
                return null;
            }

            if (this.browser.webkit && !sel.getRangeAt) {
                var _range = this._getDoc().createRange();
                try {
                    _range.setStart(sel.anchorNode, sel.anchorOffset);
                    _range.setEnd(sel.focusNode, sel.focusOffset);
                } catch (e) {
                    _range = this._getWindow().getSelection()+'';
                }
                return _range;
            }

            if (this.browser.ie || this.browser.opera) {
                return sel.createRange();
            }

            if (sel.rangeCount > 0) {
                return sel.getRangeAt(0);
            }
            return null;
        },
        /**
        * @private
        * @method _setDesignMode
        * @description Sets the designMode of the iFrame document.
        * @param {String} state This should be either on or off
        */
        _setDesignMode: function(state) {
            try {
                this._getDoc().designMode = state;
            } catch(e) { }
        },
        /**
        * @private
        * @method _toggleDesignMode
        * @description Toggles the designMode of the iFrame document on and off.
        * @returns {String} The state that it was set to.
        */
        _toggleDesignMode: function() {
            var _dMode = this._getDoc().designMode,
                _state = 'on';
            if (_dMode == 'on') {
                _state = 'off';
            }
            this._setDesignMode(_state);
            return _state;
        },
        /**
        * @private
        * @method _initEditor
        * @description This method is fired from _checkLoaded when the document is ready. It turns on designMode and set's up the listeners.
        */
        _initEditor: function() {
            YAHOO.log('editorLoaded', 'info', 'SimpleEditor');
            if (this.browser.ie) {
                this._getDoc().body.style.margin = '0';
            }
            if (!this.get('disabled')) {
                this._setDesignMode('on');
            }
            
            this.toolbar.on('buttonClick', this._handleToolbarClick, this, true);
            //Setup Listeners on iFrame
            Event.on(this._getDoc(), 'mouseup', this._handleMouseUp, this, true);
            Event.on(this._getDoc(), 'mousedown', this._handleMouseDown, this, true);
            Event.on(this._getDoc(), 'click', this._handleClick, this, true);
            Event.on(this._getDoc(), 'dblclick', this._handleDoubleClick, this, true);
            Event.on(this._getDoc(), 'keypress', this._handleKeyPress, this, true);
            Event.on(this._getDoc(), 'keyup', this._handleKeyUp, this, true);
            Event.on(this._getDoc(), 'keydown', this._handleKeyDown, this, true);
            if (!this.get('disabled')) {
                this.toolbar.set('disabled', false);
            }
            this.fireEvent('editorContentLoaded', { type: 'editorLoaded', target: this });
            if (this.get('dompath')) {
                YAHOO.log('Delayed DomPath write', 'info', 'SimpleEditor');
                var self = this;
                setTimeout(function() {
                    self._writeDomPath.call(self);
                }, 150);
            }
            this.nodeChange(true);
            this._setBusy(true);
        },
        /**
        * @private
        * @method _checkLoaded
        * @description Called from a setTimeout loop to check if the iframes body.onload event has fired, then it will init the editor.
        */
        _checkLoaded: function() {
            this._contentTimerCounter++;
            if (this._contentTimer) {
                clearTimeout(this._contentTimer);
            }
            if (this._contentTimerCounter > 250) {
                YAHOO.log('ERROR: Body Did Not load', 'error', 'SimpleEditor');
                return false;
            }
            var init = false;
            try {
                if (this._getDoc() && this._getDoc().body && (this._getDoc().body._rteLoaded === true)) {
                    init = true;
                }
            } catch (e) {
                init = false;
                YAHOO.log('checking body (e)' + e, 'error', 'SimpleEditor');
            }

            if (init === true) {
                //The onload event has fired, clean up after ourselves and fire the _initEditor method
                this._initEditor();
            } else {
                var self = this;
                this._contentTimer = setTimeout(function() {
                    self._checkLoaded.call(self);
                }, 20);
            }
        },
        /**
        * @private
        * @method _setInitialContent
        * @description This method will open the iframes content document and write the textareas value into it, then start the body.onload checking.
        */
        _setInitialContent: function() {
            YAHOO.log('Populating editor body with contents of the text area', 'info', 'SimpleEditor');
            var html = Lang.substitute(this.get('html'), {
                TITLE: this.STR_TITLE,
                CONTENT: this.get('element').value,
                CSS: this.get('css'),
                HIDDEN_CSS: this.get('hiddencss')
            }),
            check = true;
            if (this.browser.ie || this.browser.webkit || this.browser.opera || (navigator.userAgent.indexOf('Firefox/1.5') != -1)) {
                //Firefox 1.5 doesn't like setting designMode on an document created with a data url
                try {
                    this._getDoc().open();
                    this._getDoc().write(html);
                    this._getDoc().close();
                } catch (e) {
                    YAHOO.log('Setting doc failed.. (_setInitialContent)', 'error', 'SimpleEditor');
                    //Safari will only be here if we are hidden
                    check = false;
                }
            } else {
                //This keeps Firefox 2 from writing the iframe to history preserving the back buttons functionality
                this.get('iframe').get('element').src = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
            }
            if (check) {
                this._checkLoaded();
            }
        },
        /**
        * @private
        * @method _setMarkupType
        * @param {String} action The action to take. Possible values are: css, default or semantic
        * @description This method will turn on/off the useCSS execCommand.
        */
        _setMarkupType: function(action) {
            switch (this.get('markup')) {
                case 'css':
                    this._setEditorStyle(true);
                    break;
                case 'default':
                    this._setEditorStyle(false);
                    break;
                case 'semantic':
                case 'xhtml':
                    if (this._semantic[action]) {
                        this._setEditorStyle(false);
                    } else {
                        this._setEditorStyle(true);
                    }
                    break;
            }
        },
        /**
        * Set the editor to use CSS instead of HTML
        * @param {Booleen} stat True/False
        */
        _setEditorStyle: function(stat) {
            try {
                this._getDoc().execCommand('useCSS', false, !stat);
            } catch (ex) {
            }
        },
        /**
        * @private
        * @method _getSelectedElement
        * @description This method will attempt to locate the element that was last interacted with, either via selection, location or event.
        * @returns {HTMLElement} The currently selected element.
        */
        _getSelectedElement: function() {
            var doc = this._getDoc(),
                range = null,
                sel = null,
                elm = null;

            if (this.browser.ie) {
                this.currentEvent = this._getWindow().event; //Event utility assumes window.event, so we need to reset it to this._getWindow().event;
                range = this._getRange();
                if (range) {
                    elm = range.item ? range.item(0) : range.parentElement();
                    if (elm == doc.body) {
                        elm = null;
                    }
                }
                if ((this.currentEvent !== null) && (this.currentEvent.keyCode === 0)) {
                    elm = Event.getTarget(this.currentEvent);
                }
            } else {
                sel = this._getSelection();
                range = this._getRange();

                if (!sel || !range) {
                    return null;
                }
                if (!this._hasSelection() && !this.browser.webkit) {
                    if (sel.anchorNode && (sel.anchorNode.nodeType == 3)) {
                        if (sel.anchorNode.parentNode) { //next check parentNode
                            elm = sel.anchorNode.parentNode;
                        }
                        if (sel.anchorNode.nextSibling != sel.focusNode.nextSibling) {
                            elm = sel.anchorNode.nextSibling;
                        }
                    }
                    
                    if (this._isElement(elm, 'br')) {
                        elm = null;
                    }
                
                    if (!elm) {
                        elm = range.commonAncestorContainer;
                        if (!range.collapsed) {
                            if (range.startContainer == range.endContainer) {
                                if (range.startOffset - range.endOffset < 2) {
                                    if (range.startContainer.hasChildNodes()) {
                                        elm = range.startContainer.childNodes[range.startOffset];
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (this.currentEvent !== null) {
                try {
                    switch (this.currentEvent.type) {
                        case 'click':
                        case 'mousedown':
                        case 'mouseup':
                            elm = Event.getTarget(this.currentEvent);
                            break;
                        default:
                            //Do nothing
                            break;
                    }
                } catch (e) {
                    YAHOO.log('Firefox 1.5 errors here: ' + e, 'error', 'SimpleEditor');
                }
            } else if (this.currentElement && this.currentElement[0]) {
                elm = this.currentElement[0];
            }

            if (this.browser.opera || this.browser.webkit) {
                if (this.currentEvent && !elm) {
                    elm = YAHOO.util.Event.getTarget(this.currentEvent);
                }
            }

            if (!elm || !elm.tagName) {
                elm = doc.body;
            }
            if (this._isElement(elm, 'html')) {
                //Safari sometimes gives us the HTML node back..
                elm = doc.body;
            }
            if (this._isElement(elm, 'body')) {
                //make sure that body means this body not the parent..
                elm = doc.body;
            }
            if (elm && !elm.parentNode) { //Not in document
                elm = doc.body;
            }
            if (elm === undefined) {
                elm = null;
            }
            return elm;
        },
        /**
        * @private
        * @method _getDomPath
        * @description This method will attempt to build the DOM path from the currently selected element.
        * @returns {Array} An array of node references that will create the DOM Path.
        */
        _getDomPath: function() {
			var el = this._getSelectedElement();
			var domPath = [];
            while (el !== null) {
                if (el.ownerDocument != this._getDoc()) {
                    el = null;
                    break;
                }
                //Check to see if we get el.nodeName and nodeType
                if (el.nodeName && el.nodeType && (el.nodeType == 1)) {
                    domPath[domPath.length] = el;
                }

                if (this._isElement(el, 'body')) {
                    break;
                }

                el = el.parentNode;
            }
            if (domPath.length === 0) {
                if (this._getDoc() && this._getDoc().body) {
                    domPath[0] = this._getDoc().body;
                }
            }
            return domPath.reverse();
        },
        /**
        * @private
        * @method _writeDomPath
        * @description Write the current DOM path out to the dompath container below the editor.
        */
        _writeDomPath: function() { 
            var path = this._getDomPath(),
                pathArr = [],
                classPath = '',
                pathStr = '';
            for (var i = 0; i < path.length; i++) {
                var tag = path[i].tagName.toLowerCase();
                if ((tag == 'ol') && (path[i].type)) {
                    tag += ':' + path[i].type;
                }
                if (Dom.hasClass(path[i], 'yui-tag')) {
                    tag = path[i].getAttribute('tag');
                }
                if ((this.get('markup') == 'semantic') || (this.get('markup') == 'xhtml')) {
                    switch (tag) {
                        case 'b': tag = 'strong'; break;
                        case 'i': tag = 'em'; break;
                    }
                }
                if (!Dom.hasClass(path[i], 'yui-non')) {
                    if (Dom.hasClass(path[i], 'yui-tag')) {
                        pathStr = tag;
                    } else {
                        classPath = ((path[i].className !== '') ? '.' + path[i].className.replace(/ /g, '.') : '');
                        if ((classPath.indexOf('yui') != -1) || (classPath.toLowerCase().indexOf('apple-style-span') != -1)) {
                            classPath = '';
                        }
                        pathStr = tag + ((path[i].id) ? '#' + path[i].id : '') + classPath;
                    }
                    switch (tag) {
                        case 'a':
                            if (path[i].getAttribute('href')) {
                                pathStr += ':' + path[i].getAttribute('href').replace('mailto:', '').replace('http:/'+'/', '').replace('https:/'+'/', ''); //May need to add others here ftp
                            }
                            break;
                        case 'img':
                            var h = path[i].height;
                            var w = path[i].width;
                            if (path[i].style.height) {
                                h = parseInt(path[i].style.height, 10);
                            }
                            if (path[i].style.width) {
                                w = parseInt(path[i].style.width, 10);
                            }
                            pathStr += '(' + h + 'x' + w + ')';
                        break;
                    }

                    if (pathStr.length > 10) {
                        pathStr = '<span title="' + pathStr + '">' + pathStr.substring(0, 10) + '...' + '</span>';
                    } else {
                        pathStr = '<span title="' + pathStr + '">' + pathStr + '</span>';
                    }
                    pathArr[pathArr.length] = pathStr;
                }
            }
            var str = pathArr.join(' ' + this.SEP_DOMPATH + ' ');
            //Prevent flickering
            if (this.dompath.innerHTML != str) {
                this.dompath.innerHTML = str;
            }
        },
        /**
        * @private
        * @method _fixNodes
        * @description Fix href and imgs as well as remove invalid HTML.
        */
        _fixNodes: function() {
            var doc = this._getDoc(),
                els = [];

            for (var v in this.invalidHTML) {
                if (YAHOO.lang.hasOwnProperty(this.invalidHTML, v)) {
                    var tags = doc.body.getElementsByTagName(v);
                    if (tags.length) {
                        for (var i = 0; i < tags.length; i++) {
                            els.push(tags[i]);
                        }
                    }
                }
            }
            for (var h = 0; h < els.length; h++) {
                if (els[h].parentNode) {
                    els[h].parentNode.removeChild(els[h]);
                }
            }
            var imgs = this._getDoc().getElementsByTagName('img');
            Dom.addClass(imgs, 'yui-img');   
        },
        /**
        * @private
        * @method _showHidden
        * @description Toggle on/off the hidden.css file.
        */
        _showHidden: function() {
            if (this._showingHiddenElements) {
                YAHOO.log('Enabling hidden CSS File', 'info', 'SimpleEditor');
                this._showingHiddenElements = false;
                this.toolbar.deselectButton('hiddenelements');
                Dom.removeClass(this._getDoc().body, this.CLASS_HIDDEN);
            } else {
                YAHOO.log('Disabling hidden CSS File', 'info', 'SimpleEditor');
                this._showingHiddenElements = true;
                Dom.addClass(this._getDoc().body, this.CLASS_HIDDEN);
                this.toolbar.selectButton('hiddenelements');
            }
        },
        /**
        * @private
        * @method _setCurrentEvent
        * @param {Event} ev The event to cache
        * @description Sets the current event property
        */
        _setCurrentEvent: function(ev) {
            this.currentEvent = ev;
        },
        /**
        * @private
        * @method _handleClick
        * @param {Event} ev The event we are working on.
        * @description Handles all click events inside the iFrame document.
        */
        _handleClick: function(ev) {
            this._setCurrentEvent(ev);
            if (this.currentWindow) {
                this.closeWindow();
            }
            if (YAHOO.widget.EditorInfo.window.win && YAHOO.widget.EditorInfo.window.scope) {
                YAHOO.widget.EditorInfo.window.scope.closeWindow.call(YAHOO.widget.EditorInfo.window.scope);
            }
            if (this.browser.webkit) {
                var tar =Event.getTarget(ev);
                if (this._isElement(tar, 'a') || this._isElement(tar.parentNode, 'a')) {
                    Event.stopEvent(ev);
                    this.nodeChange();
                }
            } else {
                this.nodeChange();
            }
        },
        /**
        * @private
        * @method _handleMouseUp
        * @param {Event} ev The event we are working on.
        * @description Handles all mouseup events inside the iFrame document.
        */
        _handleMouseUp: function(ev) {
            this._setCurrentEvent(ev);
            var self = this;
            if (this.browser.opera) {
                /**
                * @knownissue Opera appears to stop the MouseDown, Click and DoubleClick events on an image inside of a document with designMode on..
                * @browser Opera
                * @description This work around traps the MouseUp event and sets a timer to check if another MouseUp event fires in so many seconds. If another event is fired, they we internally fire the DoubleClick event.
                */
                var sel = Event.getTarget(ev);
                if (this._isElement(sel, 'img')) {
                    this.nodeChange();
                    if (this.operaEvent) {
                        clearTimeout(this.operaEvent);
                        this.operaEvent = null;
                        this._handleDoubleClick(ev);
                    } else {
                        this.operaEvent = window.setTimeout(function() {
                            self.operaEvent = false;
                        }, 700);
                    }
                }
            }
            //This will stop Safari from selecting the entire document if you select all the text in the editor
            if (this.browser.webkit || this.browser.opera) {
                if (this.browser.webkit) {
                    Event.stopEvent(ev);
                }
            }
            this.nodeChange();
            this.fireEvent('editorMouseUp', { type: 'editorMouseUp', target: this, ev: ev });
        },
        /**
        * @private
        * @method _handleMouseDown
        * @param {Event} ev The event we are working on.
        * @description Handles all mousedown events inside the iFrame document.
        */
        _handleMouseDown: function(ev) {
            this._setCurrentEvent(ev);
            var sel = Event.getTarget(ev);
            if (this.browser.webkit && this._hasSelection()) {
                var _sel = this._getSelection();
                if (!this.browser.webkit3) {
                    _sel.collapse(true);
                } else {
                    _sel.collapseToStart();
                }
            }
            if (this.browser.webkit && this._lastImage) {
                Dom.removeClass(this._lastImage, 'selected');
                this._lastImage = null;
            }
            if (this._isElement(sel, 'img') || this._isElement(sel, 'a')) {
                if (this.browser.webkit) {
                    Event.stopEvent(ev);
                    if (this._isElement(sel, 'img')) {
                        Dom.addClass(sel, 'selected');
                        this._lastImage = sel;
                    }
                }
                this.nodeChange();
            }
            this.fireEvent('editorMouseDown', { type: 'editorMouseDown', target: this, ev: ev });
        },
        /**
        * @private
        * @method _handleDoubleClick
        * @param {Event} ev The event we are working on.
        * @description Handles all doubleclick events inside the iFrame document.
        */
        _handleDoubleClick: function(ev) {
            this._setCurrentEvent(ev);
            var sel = Event.getTarget(ev);
            if (this._isElement(sel, 'img')) {
                this.currentElement[0] = sel;
                this.toolbar.fireEvent('insertimageClick', { type: 'insertimageClick', target: this.toolbar });
                this.fireEvent('afterExecCommand', { type: 'afterExecCommand', target: this });
            } else if (this._isElement(sel, 'a')) {
                this.currentElement[0] = sel;
                this.toolbar.fireEvent('createlinkClick', { type: 'createlinkClick', target: this.toolbar });
                this.fireEvent('afterExecCommand', { type: 'afterExecCommand', target: this });
            }
            this.nodeChange();
            this.editorDirty = false;
            this.fireEvent('editorDoubleClick', { type: 'editorDoubleClick', target: this, ev: ev });
        },
        /**
        * @private
        * @method _handleKeyUp
        * @param {Event} ev The event we are working on.
        * @description Handles all keyup events inside the iFrame document.
        */
        _handleKeyUp: function(ev) {
            this._setCurrentEvent(ev);
            switch (ev.keyCode) {
                case 37: //Left Arrow
                case 38: //Up Arrow
                case 39: //Right Arrow
                case 40: //Down Arrow
                case 46: //Forward Delete
                case 8: //Delete
                case 87: //W key if window is open
                    if ((ev.keyCode == 87) && this.currentWindow && ev.shiftKey && ev.ctrlKey) {
                        this.closeWindow();
                    } else {
                        if (!this.browser.ie) {
                            if (this._nodeChangeTimer) {
                                clearTimeout(this._nodeChangeTimer);
                            }
                            var self = this;
                            this._nodeChangeTimer = setTimeout(function() {
                                self._nodeChangeTimer = null;
                                self.nodeChange.call(self);
                            }, 100);
                        } else {
                            this.nodeChange();
                        }
                        this.editorDirty = true;
                    }
                    break;
            }
            this.fireEvent('editorKeyUp', { type: 'editorKeyUp', target: this, ev: ev });
        },
        /**
        * @private
        * @method _handleKeyPress
        * @param {Event} ev The event we are working on.
        * @description Handles all keypress events inside the iFrame document.
        */
        _handleKeyPress: function(ev) {
            this._setCurrentEvent(ev);
            this.fireEvent('editorKeyPress', { type: 'editorKeyPress', target: this, ev: ev });
        },
        /**
        * @private
        * @method _handleKeyDown
        * @param {Event} ev The event we are working on.
        * @description Handles all keydown events inside the iFrame document.
        */
        _handleKeyDown: function(ev) {
            this._setCurrentEvent(ev);
            if (this.currentWindow) {
                this.closeWindow();
            }
            if (YAHOO.widget.EditorInfo.window.win && YAHOO.widget.EditorInfo.window.scope) {
                YAHOO.widget.EditorInfo.window.scope.closeWindow.call(YAHOO.widget.EditorInfo.window.scope);
            }
            var doExec = false,
                action = null,
                exec = false;

            if (ev.shiftKey && ev.ctrlKey) {
                doExec = true;
            }
            switch (ev.keyCode) {
                case 84: //Focus Toolbar Header -- Ctrl + Shift + T
                    if (ev.shiftKey && ev.ctrlKey) {
                        this.toolbar._titlebar.firstChild.focus();
                        Event.stopEvent(ev);
                        doExec = false;
                    }
                    break;
                case 27: //Focus After Element - Ctrl + Shift + Esc
                    if (ev.shiftKey) {
                        this.afterElement.focus();
                        Event.stopEvent(ev);
                        exec = false;
                    }
                    break;
                case 219: //Left
                    action = 'justifyleft';
                    break;
                case 220: //Center
                    action = 'justifycenter';
                    break;
                case 221: //Right
                    action = 'justifyright';
                    break;
                case 76: //L
                    if (this._hasSelection()) {
                        if (ev.shiftKey && ev.ctrlKey) {
                            this.execCommand('createlink', '');
                            this.toolbar.fireEvent('createlinkClick', { type: 'createlinkClick', target: this.toolbar });
                            this.fireEvent('afterExecCommand', { type: 'afterExecCommand', target: this });
                            doExec = false;
                        }
                    }
                    break;
                case 65:
                    if (ev.metaKey && this.browser.webkit) {
                        Event.stopEvent(ev);
                        //Override Safari's select all and select the contents of the editor not the iframe as Safari would by default.
                        this._getSelection().setBaseAndExtent(this._getDoc().body, 1, this._getDoc().body, this._getDoc().body.innerHTML.length);
                    }
                    break;
                case 66: //B
                    action = 'bold';
                    break;
                case 73: //I
                    action = 'italic';
                    break;
                case 85: //U
                    action = 'underline';
                    break;
                case 9: //Tab Key
                    if (this.browser.safari) {
                        this._getDoc().execCommand('inserttext', false, '\t');
                        Event.stopEvent(ev);
                    }
                    break;
                case 13:
                    if (this.browser.ie) {
                        //Insert a <br> instead of a <p></p> in Internet Explorer
                        var _range = this._getRange();
                        var tar = this._getSelectedElement();
                        if (!this._isElement(tar, 'li')) {
                            if (_range) {
                                _range.pasteHTML('<br>');
                                _range.collapse(false);
                                _range.select();
                            }
                            Event.stopEvent(ev);
                        }
                    }
            }
            if (doExec && action) {
                this.execCommand(action, null);
                Event.stopEvent(ev);
                this.nodeChange();
            }
            this.fireEvent('editorKeyDown', { type: 'editorKeyDown', target: this, ev: ev });
        },
        /**
        * @method nodeChange
        * @param {Boolean} force Optional paramenter to skip the threshold counter
        * @description Handles setting up the toolbar buttons, getting the Dom path, fixing nodes.
        */
        nodeChange: function(force) {
            var threshold = parseInt(this.get('nodeChangeThreshold'), 10);
            var thisNodeChange = Math.round(new Date().getTime() / 1000);
            if (force === true) {
                this._lastNodeChange = 0;
            }
            
            if ((this._lastNodeChange + threshold) < thisNodeChange) {
                var self = this;
                if (this._fixNodesTimer === null) {
                    this._fixNodesTimer = window.setTimeout(function() {
                        self._fixNodes.call(self);
                        self._fixNodesTimer = null;
                    }, 0);
                }
            }
            this._lastNodeChange = thisNodeChange;
            if (this.currentEvent) {
                this._lastNodeChangeEvent = this.currentEvent.type;
            }

            var beforeNodeChange = this.fireEvent('beforeNodeChange', { type: 'beforeNodeChange', target: this });
            if (beforeNodeChange === false) {
                return false;
            }
            if (this.get('dompath')) {
                this._writeDomPath();
            }
            //Check to see if we are disabled before continuing
            if (!this.get('disabled')) {
                if (this.STOP_NODE_CHANGE) {
                    //Reset this var for next action
                    this.STOP_NODE_CHANGE = false;
                    return false;
                } else {
                    var sel = this._getSelection(),
                        range = this._getRange(),
                        el = this._getSelectedElement(),
                        fn_button = this.toolbar.getButtonByValue('fontname'),
                        fs_button = this.toolbar.getButtonByValue('fontsize');

                    if (force !== true) {
                        this.editorDirty = true;
                    }

                    //Handle updating the toolbar with active buttons
                    var _ex = {};
                    if (this._lastButton) {
                        _ex[this._lastButton.id] = true;
                    }
                    if (!this._isElement(el, 'body')) {
                        if (fn_button) {
                            _ex[fn_button.get('id')] = true;
                        }
                        if (fs_button) {
                            _ex[fs_button.get('id')] = true;
                        }
                    }
                    this.toolbar.resetAllButtons(_ex);

                    //Handle disabled buttons
                    for (var d = 0; d < this._disabled.length; d++) {
                        var _button = this.toolbar.getButtonByValue(this._disabled[d]);
                        if (_button && _button.get) {
                            if (this._lastButton && (_button.get('id') === this._lastButton.id)) {
                                //Skip
                            } else {
                                if (!this._hasSelection()) {
                                    switch (this._disabled[d]) {
                                        case 'fontname':
                                        case 'fontsize':
                                            break;
                                        default:
                                            //No Selection - disable
                                            this.toolbar.disableButton(_button);
                                    }
                                } else {
                                    if (!this._alwaysDisabled[this._disabled[d]]) {
                                        this.toolbar.enableButton(_button);
                                    }
                                }
                                if (!this._alwaysEnabled[this._disabled[d]]) {
                                    this.toolbar.deselectButton(_button);
                                }
                            }
                        }
                    }
                    var path = this._getDomPath();
                    var olType = null, tag = null, cmd = null;
                    for (var i = 0; i < path.length; i++) {
                        tag = path[i].tagName.toLowerCase();
                        if (path[i].getAttribute('tag')) {
                            tag = path[i].getAttribute('tag').toLowerCase();
                        }
                        cmd = this._tag2cmd[tag];
                        if (cmd === undefined) {
                            cmd = [];
                        }
                        if (!Lang.isArray(cmd)) {
                            cmd = [cmd];
                        }

                        //Bold and Italic styles
                        if (path[i].style.fontWeight.toLowerCase() == 'bold') {
                            cmd[cmd.length] = 'bold';
                        }
                        if (path[i].style.fontStyle.toLowerCase() == 'italic') {
                            cmd[cmd.length] = 'italic';
                        }
                        if (path[i].style.textDecoration.toLowerCase() == 'underline') {
                            cmd[cmd.length] = 'underline';
                        }
                        if (cmd.length > 0) {
                            for (var j = 0; j < cmd.length; j++) {
                                this.toolbar.selectButton(cmd[j]);
                                this.toolbar.enableButton(cmd[j]);
                            }
                        }
                        //Handle Alignment
                        switch (path[i].style.textAlign.toLowerCase()) {
                            case 'left':
                            case 'right':
                            case 'center':
                            case 'justify':
                                var alignType = path[i].style.textAlign.toLowerCase();
                                if (path[i].style.textAlign.toLowerCase() == 'justify') {
                                    alignType = 'full';
                                }
                                this.toolbar.selectButton('justify' + alignType);
                                this.toolbar.enableButton('justify' + alignType);
                                break;
                        }
                    }
                    //After for loop

                    //Reset Font Family and Size to the inital configs
                    if (fn_button) {
                        var family = fn_button._configs.label._initialConfig.value;
                        fn_button.set('label', '<span class="yui-toolbar-fontname-' + _cleanClassName(family) + '">' + family + '</span>');
                        this._updateMenuChecked('fontname', family);
                    }

                    if (fs_button) {
                        fs_button.set('label', fs_button._configs.label._initialConfig.value);
                    }

                    var hd_button = this.toolbar.getButtonByValue('heading');
                    if (hd_button) {
                        hd_button.set('label', hd_button._configs.label._initialConfig.value);
                        this._updateMenuChecked('heading', 'none');
                    }
                    var img_button = this.toolbar.getButtonByValue('insertimage');
                    if (img_button && this.currentWindow && (this.currentWindow.name == 'insertimage')) {
                        this.toolbar.disableButton(img_button);
                    }
                }
            }

            this.fireEvent('afterNodeChange', { type: 'afterNodeChange', target: this });
        },
        /**
        * @private
        * @method _updateMenuChecked
        * @param {Object} button The command identifier of the button you want to check
        * @param {String} value The value of the menu item you want to check
        * @param {<a href="YAHOO.widget.Toolbar.html">YAHOO.widget.Toolbar</a>} The Toolbar instance the button belongs to (defaults to this.toolbar) 
        * @description Gets the menu from a button instance, if the menu is not rendered it will render it. It will then search the menu for the specified value, unchecking all other items and checking the specified on.
        */
        _updateMenuChecked: function(button, value, tbar) {
            if (!tbar) {
                tbar = this.toolbar;
            }
            var _button = tbar.getButtonByValue(button);
            _button.checkValue(value);
        },
        /**
        * @private
        * @method _handleToolbarClick
        * @param {Event} ev The event that triggered the button click
        * @description This is an event handler attached to the Toolbar's buttonClick event. It will fire execCommand with the command identifier from the Toolbar Button.
        */
        _handleToolbarClick: function(ev) {
            var value = '';
            var str = '';
            var cmd = ev.button.value;
            if (ev.button.menucmd) {
                value = cmd;
                cmd = ev.button.menucmd;
            }
            this._lastButton = ev.button;
            if (this.STOP_EXEC_COMMAND) {
                YAHOO.log('execCommand skipped because we found the STOP_EXEC_COMMAND flag set to true', 'warn', 'SimpleEditor');
                YAHOO.log('NOEXEC::execCommand::(' + cmd + '), (' + value + ')', 'warn', 'SimpleEditor');
                this.STOP_EXEC_COMMAND = false;
                return false;
            } else {
                this.execCommand(cmd, value);
                if (!this.browser.webkit) {
                     var self = this;
                     setTimeout(function() {
                         self._focusWindow.call(self);
                     }, 5);
                 }
            }
            Event.stopEvent(ev);
        },
        /**
        * @private
        * @method _setupAfterElement
        * @description Creates the accessibility h2 header and places it after the iframe in the Dom for navigation.
        */
        _setupAfterElement: function() {
            if (!this.afterElement) {
                this.afterElement = document.createElement('h2');
                this.afterElement.className = 'yui-editor-skipheader';
                this.afterElement.tabIndex = '-1';
                this.afterElement.innerHTML = this.STR_LEAVE_EDITOR;
                this.get('element_cont').get('firstChild').appendChild(this.afterElement);
            }
        },
        /**
        * @private
        * @method _disableEditor
        * @param {Boolean} disabled Pass true to disable, false to enable
        * @description Creates a mask to place over the Editor.
        */
        _disableEditor: function(disabled) {
            if (disabled) {
                if (!this._mask) {
                    this._setDesignMode('off');
                    if (this.toolbar) {
                        this.toolbar.set('disabled', true);
                    }
                    this._mask = document.createElement('DIV');
                    Dom.setStyle(this._mask, 'height', '100%');
                    Dom.setStyle(this._mask, 'width', '100%');
                    Dom.setStyle(this._mask, 'position', 'absolute');
                    Dom.setStyle(this._mask, 'top', '0');
                    Dom.setStyle(this._mask, 'left', '0');
                    Dom.setStyle(this._mask, 'opacity', '.5');
                    Dom.addClass(this._mask, 'yui-editor-masked');
                    this.get('iframe').get('parentNode').appendChild(this._mask);
                }
            } else {
                if (this._mask) {
                    this._mask.parentNode.removeChild(this._mask);
                    this._mask = null;
                    if (this.toolbar) {
                        this.toolbar.set('disabled', false);
                    }
                    this._setDesignMode('on');
                    this._focusWindow();
                    var self = this;
                    window.setTimeout(function() {
                        self.nodeChange.call(self);
                    }, 100);
                }
            }
        },
        /**
        * @property EDITOR_PANEL_ID
        * @description HTML id to give the properties window in the DOM.
        * @type String
        */
        EDITOR_PANEL_ID: 'yui-editor-panel',
        /**
        * @property SEP_DOMPATH
        * @description The value to place in between the Dom path items
        * @type String
        */
        SEP_DOMPATH: '<',
        /**
        * @property STR_LEAVE_EDITOR
        * @description The accessibility string for the element after the iFrame
        * @type String
        */
        STR_LEAVE_EDITOR: 'You have left the Rich Text Editor.',
        /**
        * @property STR_BEFORE_EDITOR
        * @description The accessibility string for the element before the iFrame
        * @type String
        */
        STR_BEFORE_EDITOR: 'This text field can contain stylized text and graphics. To cycle through all formatting options, use the keyboard shortcut Control + Shift + T to place focus on the toolbar and navigate between option heading names. <h4>Common formatting keyboard shortcuts:</h4><ul><li>Control Shift B sets text to bold</li> <li>Control Shift I sets text to italic</li> <li>Control Shift U underlines text</li> <li>Control Shift [ aligns text left</li> <li>Control Shift | centers text</li> <li>Control Shift ] aligns text right</li> <li>Control Shift L adds an HTML link</li> <li>To exit this text editor use the keyboard shortcut Control + Shift + ESC.</li></ul>',
        /**
        * @property STR_TITLE
        * @description The Title of the HTML document that is created in the iFrame
        * @type String
        */
        STR_TITLE: 'Rich Text Area.',
        /**
        * @property STR_IMAGE_HERE
        * @description The text to place in the URL textbox when using the blankimage.
        * @type String
        */
        STR_IMAGE_HERE: 'Image Url Here',
        /**
        * @property STR_LINK_URL
        * @description The label string for the Link URL.
        * @type String
        */
        STR_LINK_URL: 'Link URL',
        /**
        * @protected
        * @property STOP_EXEC_COMMAND
        * @description Set to true when you want the default execCommand function to not process anything
        * @type Boolean
        */
        STOP_EXEC_COMMAND: false,
        /**
        * @protected
        * @property STOP_NODE_CHANGE
        * @description Set to true when you want the default nodeChange function to not process anything
        * @type Boolean
        */
        STOP_NODE_CHANGE: false,
        /**
        * @protected
        * @property CLASS_HIDDEN
        * @description CSS class applied to the body when the hiddenelements button is pressed.
        * @type String
        */
        CLASS_HIDDEN: 'hidden',
        /**
        * @protected
        * @property CLASS_CONTAINER
        * @description Default CSS class to apply to the editors container element
        * @type String
        */
        CLASS_CONTAINER: 'yui-editor-container',
        /**
        * @protected
        * @property CLASS_EDITABLE
        * @description Default CSS class to apply to the editors iframe element
        * @type String
        */
        CLASS_EDITABLE: 'yui-editor-editable',
        /**
        * @protected
        * @property CLASS_EDITABLE_CONT
        * @description Default CSS class to apply to the editors iframe's parent element
        * @type String
        */
        CLASS_EDITABLE_CONT: 'yui-editor-editable-container',
        /**
        * @protected
        * @property CLASS_PREFIX
        * @description Default prefix for dynamically created class names
        * @type String
        */
        CLASS_PREFIX: 'yui-editor',
        /** 
        * @property browser
        * @description Standard browser detection
        * @type Object
        */
        browser: function() {
            var br = YAHOO.env.ua;
            //Check for webkit3
            if (br.webkit > 420) {
                br.webkit3 = br.webkit;
            } else {
                br.webkit3 = 0;
            }
            return br;
        }(),
        /** 
        * @method init
        * @description The Editor class' initialization method
        */
        init: function(p_oElement, p_oAttributes) {
            YAHOO.log('init', 'info', 'SimpleEditor');
            YAHOO.widget.SimpleEditor.superclass.init.call(this, p_oElement, p_oAttributes);
            YAHOO.widget.EditorInfo._instances[this.get('id')] = this;

            this.on('contentReady', function() {
                this.DOMReady = true;
                this.fireQueue();
            }, this, true);
        },
        /**
        * @method initAttributes
        * @description Initializes all of the configuration attributes used to create 
        * the editor.
        * @param {Object} attr Object literal specifying a set of 
        * configuration attributes used to create the editor.
        */
        initAttributes: function(attr) {
            YAHOO.widget.SimpleEditor.superclass.initAttributes.call(this, attr);
            var self = this;

            /**
            * @private
            * @config iframe
            * @description Internal config for holding the iframe element.
            * @default null
            * @type HTMLElement
            */
            this.setAttributeConfig('iframe', {
                value: null
            });
            /**
            * @private
            * @depreciated
            * @config textarea
            * @description Internal config for holding the textarea element (replaced with element).
            * @default null
            * @type HTMLElement
            */
            this.setAttributeConfig('textarea', {
                value: null,
                writeOnce: true
            });
            /**
            * @config nodeChangeThreshold
            * @description The number of seconds that need to be in between nodeChange processing
            * @default 3
            * @type Number
            */            
            this.setAttributeConfig('nodeChangeThreshold', {
                value: attr.nodeChangeThreshold || 3,
                validator: YAHOO.lang.isNumber
            });
            /**
            * @config element_cont
            * @description Internal config for the editors container
            * @default false
            * @type HTMLElement
            */
            this.setAttributeConfig('element_cont', {
                value: attr.element_cont
            });
            /**
            * @private
            * @config editor_wrapper
            * @description The outter wrapper for the entire editor.
            * @default null
            * @type HTMLElement
            */
            this.setAttributeConfig('editor_wrapper', {
                value: attr.editor_wrapper || null,
                writeOnce: true
            });
            /**
            * @attribute height
            * @description The height of the editor iframe container, not including the toolbar..
            * @default Best guessed size of the textarea, for best results use CSS to style the height of the textarea or pass it in as an argument
            * @type String
            */
            this.setAttributeConfig('height', {
                value: attr.height || Dom.getStyle(self.get('element'), 'height'),
                method: function(height) {
                    if (this._rendered) {
                        //We have been rendered, change the height
                        if (this.get('animate')) {
                            var anim = new YAHOO.util.Anim(this.get('iframe').get('parentNode'), {
                                height: {
                                    to: parseInt(height, 10)
                                }
                            }, 0.5);
                            anim.animate();
                        } else {
                            Dom.setStyle(this.get('iframe').get('parentNode'), 'height', height);
                        }
                    }
                }
            });
            /**
            * @attribute width
            * @description The width of the editor container.
            * @default Best guessed size of the textarea, for best results use CSS to style the width of the textarea or pass it in as an argument
            * @type String
            */            
            this.setAttributeConfig('width', {
                value: attr.width || Dom.getStyle(this.get('element'), 'width'),
                method: function(width) {
                    if (this._rendered) {
                        //We have been rendered, change the width
                        if (this.get('animate')) {
                            var anim = new YAHOO.util.Anim(this.get('element_cont').get('element'), {
                                width: {
                                    to: parseInt(width, 10)
                                }
                            }, 0.5);
                            anim.animate();
                        } else {
                            this.get('element_cont').setStyle('width', width);
                        }
                    }
                }
            });
                        
            /**
            * @attribute blankimage
            * @description The CSS used to show/hide hidden elements on the page
            * @default 'assets/blankimage.png'
            * @type String
            */            
            this.setAttributeConfig('blankimage', {
                value: attr.blankimage || this._getBlankImage()
            });
            /**
            * @attribute hiddencss
            * @description The CSS used to show/hide hidden elements on the page, these rules must be prefixed with the class provided in <code>this.CLASS_HIDDEN</code>
            * @default <code><pre>
            .hidden font, .hidden strong, .hidden b, .hidden em, .hidden i, .hidden u, .hidden div, .hidden p, .hidden span, .hidden img, .hidden ul, .hidden ol, .hidden li, .hidden table {
                border: 1px dotted #ccc;
            }
            .hidden .yui-non {
                border: none;
            }
            .hidden img {
                padding: 2px;
            }</pre></code>
            * @type String
            */            
            this.setAttributeConfig('hiddencss', {
                value: attr.hiddencss || '.hidden font, .hidden strong, .hidden b, .hidden em, .hidden i, .hidden u, .hidden div,.hidden p,.hidden span,.hidden img, .hidden ul, .hidden ol, .hidden li, .hidden table { border: 1px dotted #ccc; } .hidden .yui-non { border: none; } .hidden img { padding: 2px; }',
                writeOnce: true
            });
            /**
            * @attribute css
            * @description The Base CSS used to format the content of the editor
            * @default <code><pre>html {
                height: 95%;
            }
            body {
                height: 100%;
                padding: 7px; background-color: #fff; font:13px/1.22 arial,helvetica,clean,sans-serif;*font-size:small;*font:x-small;
            }
            a {
                color: blue;
                text-decoration: underline;
                cursor: pointer;
            }
            .warning-localfile {
                border-bottom: 1px dashed red !important;
            }
            .yui-busy {
                cursor: wait !important;
            }
            img.selected { //Safari image selection
                border: 2px dotted #808080;
            }
            img {
                cursor: pointer !important;
                border: none;
            }
            </pre></code>
            * @type String
            */            
            this.setAttributeConfig('css', {
                value: attr.css || 'html { height: 95%; } body { height: 100%; padding: 7px; background-color: #fff; font:13px/1.22 arial,helvetica,clean,sans-serif;*font-size:small;*font:x-small; } a { color: blue; text-decoration: underline; cursor: pointer; } .warning-localfile { border-bottom: 1px dashed red !important; } .yui-busy { cursor: wait !important; } img.selected { border: 2px dotted #808080; } img { cursor: pointer !important; border: none; }',
                writeOnce: true
            });
            /**
            * @attribute html
            * @description The default HTML to be written to the iframe document before the contents are loaded
            * @default This HTML requires a few things if you are to override:
                <p><code>{TITLE}, {CSS}, {HIDDEN_CSS}</code> and <code>{CONTENT}</code> need to be there, they are passed to YAHOO.lang.substitute to be replace with other strings.<p>
                <p><code>onload="document.body._rteLoaded = true;"</code> : the onload statement must be there or the editor will not finish loading.</p>
                <code>
                <pre>
                &lt;!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"&gt;
                &lt;html&gt;
                    &lt;head&gt;
                        &lt;title&gt;{TITLE}&lt;/title&gt;
                        &lt;meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /&gt;
                        &lt;style&gt;
                        {CSS}
                        &lt;/style&gt;
                        &lt;style&gt;
                        {HIDDEN_CSS}
                        &lt;/style&gt;
                    &lt;/head&gt;
                &lt;body onload="document.body._rteLoaded = true;"&gt;
                {CONTENT}
                &lt;/body&gt;
                &lt;/html&gt;
                </pre>
                </code>
            * @type String
            */            
            this.setAttributeConfig('html', {
                value: attr.html || '<!DOCTYPE HTML PUBLIC "-/'+'/W3C/'+'/DTD HTML 4.01/'+'/EN" "http:/'+'/www.w3.org/TR/html4/strict.dtd"><html><head><title>{TITLE}</title><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><base href="' + this._baseHREF + '"><style>{CSS}</style><style>{HIDDEN_CSS}</style></head><body onload="document.body._rteLoaded = true;">{CONTENT}</body></html>',
                writeOnce: true
            });

            /**
            * @attribute handleSubmit
            * @description Config handles if the editor will attach itself to the textareas parent form's submit handler.
            If it is set to true, the editor will attempt to attach a submit listener to the textareas parent form.
            Then it will trigger the editors save handler and place the new content back into the text area before the form is submitted.
            * @default false
            * @type Boolean
            */            
            this.setAttributeConfig('handleSubmit', {
                value: false,
                writeOnce: true,
                method: function(exec) {
                    if (exec) {
                        var ta = this.get('element');
                        if (ta.form) {
                            var submitForm = function(ev) {
                                Event.stopEvent(ev);
                                this.saveHTML();
                                window.setTimeout(function() {
                                    YAHOO.util.Event.removeListener(ta.form, 'submit', submitForm);
                                    ta.form.submit();
                                }, 200);
                            };
                            Event.on(ta.form, 'submit', submitForm, this, true);
                        }
                    }
                }
            });
            /**
            * @attribute disabled
            * @description This will toggle the editor's disabled state. When the editor is disabled, designMode is turned off and a mask is placed over the iframe so no interaction can take place.
            All Toolbar buttons are also disabled so they cannot be used.
            * @default false
            * @type Boolean
            */

            this.setAttributeConfig('disabled', {
                value: false,
                method: function(disabled) {
                    if (this._rendered) {
                        this._disableEditor(disabled);
                    }
                }
            });
            /**
            * @config toolbar_cont
            * @description Internal config for the toolbars container
            * @default false
            * @type Boolean
            */
            this.setAttributeConfig('toolbar_cont', {
                value: null,
                writeOnce: true
            });
            /**
            * @attribute toolbar
            * @description The default toolbar config.
            * @type Object
            */            
            this.setAttributeConfig('toolbar', {
                value: attr.toolbar || this._defaultToolbar,
                writeOnce: true,
                method: function(toolbar) {
                }
            });
            /**
            * @attribute animate
            * @description Should the editor animate window movements
            * @default false unless Animation is found, then true
            * @type Boolean
            */            
            this.setAttributeConfig('animate', {
                value: false,
                validator: function(value) {
                    var ret = true;
                    if (!YAHOO.util.Anim) {
                        ret = false;
                    }
                    return ret;
                }               
            });
            /**
            * @config panel
            * @description A reference to the panel we are using for windows.
            * @default false
            * @type Boolean
            */            
            this.setAttributeConfig('panel', {
                value: null,
                writeOnce: true,
                validator: function(value) {
                    var ret = true;
                    if (!YAHOO.widget.Overlay) {
                        ret = false;
                    }
                    return ret;
                }               
            });
            /**
            * @attribute localFileWarning
            * @description Should we throw the warning if we detect a file that is local to their machine?
            * @default true
            * @type Boolean
            */            
            this.setAttributeConfig('localFileWarning', {
                value: attr.locaFileWarning || true
            });
            /**
            * @attribute focusAtStart
            * @description Should we focus the window when the content is ready?
            * @default false
            * @type Boolean
            */            
            this.setAttributeConfig('focusAtStart', {
                value: attr.focusAtStart || false,
                writeOnce: true,
                method: function() {
                    this.on('editorContentLoaded', function() {
                        var self = this;
                        setTimeout(function() {
                            self._focusWindow.call(self, true);
                            self.editorDirty = false;
                        }, 400);
                    }, this, true);
                }
            });
            /**
            * @attribute dompath
            * @description Toggle the display of the current Dom path below the editor
            * @default false
            * @type Boolean
            */            
            this.setAttributeConfig('dompath', {
                value: attr.dompath || false,
                method: function(dompath) {
                    if (dompath && !this.dompath) {
                        this.dompath = document.createElement('DIV');
                        this.dompath.id = this.get('id') + '_dompath';
                        Dom.addClass(this.dompath, 'dompath');
                        this.get('element_cont').get('firstChild').appendChild(this.dompath);
                        if (this.get('iframe')) {
                            this._writeDomPath();
                        }
                    } else if (!dompath && this.dompath) {
                        this.dompath.parentNode.removeChild(this.dompath);
                        this.dompath = null;
                    }
                    this._setupAfterElement();
                }
            });
            /**
            * @attribute markup
            * @description Should we try to adjust the markup for the following types: semantic, css, default or xhtml
            * @default "semantic"
            * @type String
            */            
            this.setAttributeConfig('markup', {
                value: attr.markup || 'semantic',
                validator: function(markup) {
                    switch (markup.toLowerCase()) {
                        case 'semantic':
                        case 'css':
                        case 'default':
                        case 'xhtml':
                        return true;
                    }
                    return false;
                }
            });
            /**
            * @attribute removeLineBreaks
            * @description Should we remove linebreaks and extra spaces on cleanup
            * @default false
            * @type Boolean
            */            
            this.setAttributeConfig('removeLineBreaks', {
                value: attr.removeLineBreaks || false,
                validator: YAHOO.lang.isBoolean
            });
            

            this.on('afterRender', function() {
                this._renderPanel();
            });
        },
        /**
        * @private
        * @method _getBlankImage
        * @description Retrieves the full url of the image to use as the blank image.
        * @returns {String} The URL to the blank image
        */
        _getBlankImage: function() {
            if (!this.DOMReady) {
                this._queue[this._queue.length] = ['_getBlankImage', arguments];
                return '';
            }
            var img = '';
            if (!this._blankImageLoaded) {
                var div = document.createElement('div');
                div.style.position = 'absolute';
                div.style.top = '-9999px';
                div.style.left = '-9999px';
                div.className = this.CLASS_PREFIX + '-blankimage';
                document.body.appendChild(div);
                img = YAHOO.util.Dom.getStyle(div, 'background-image');
                img = img.replace('url(', '').replace(')', '').replace(/"/g, '');
                this.set('blankimage', img);
                this._blankImageLoaded = true;
            } else {
                img = this.get('blankimage');
            }
            return img;
        },
        /**
        * @private
        * @method _handleFontSize
        * @description Handles the font size button in the toolbar.
        * @param {Object} o Object returned from Toolbar's buttonClick Event
        */
        _handleFontSize: function(o) {
            var button = this.toolbar.getButtonById(o.button.id);
            var value = button.get('label') + 'px';
            this.execCommand('fontsize', value);
            this.STOP_EXEC_COMMAND = true;
        },
        /**
        * @private
        * @method _handleColorPicker
        * @description Handles the colorpicker buttons in the toolbar.
        * @param {Object} o Object returned from Toolbar's buttonClick Event
        */
        _handleColorPicker: function(o) {
            var cmd = o.button;
            var value = '#' + o.color;
            if ((cmd == 'forecolor') || (cmd == 'backcolor')) {
                this.execCommand(cmd, value);
            }
        },
        /**
        * @private
        * @method _handleAlign
        * @description Handles the alignment buttons in the toolbar.
        * @param {Object} o Object returned from Toolbar's buttonClick Event
        */
        _handleAlign: function(o) {
            var button = this.toolbar.getButtonById(o.button.id);
            var cmd = null;
            for (var i = 0; i < o.button.menu.length; i++) {
                if (o.button.menu[i].value == o.button.value) {
                    cmd = o.button.menu[i].value;
                }
            }
            var value = this._getSelection();

            this.execCommand(cmd, value);
            this.STOP_EXEC_COMMAND = true;
        },
        /**
        * @private
        * @method _handleAfterNodeChange
        * @description Fires after a nodeChange happens to setup the things that where reset on the node change (button state).
        */
        _handleAfterNodeChange: function() {
            var path = this._getDomPath(),
                elm = null,
                family = null,
                fontsize = null,
                validFont = false;
            var fn_button = this.toolbar.getButtonByValue('fontname');
            var fs_button = this.toolbar.getButtonByValue('fontsize');
            var hd_button = this.toolbar.getButtonByValue('heading');

            for (var i = 0; i < path.length; i++) {
                elm = path[i];

                var tag = elm.tagName.toLowerCase();


                if (elm.getAttribute('tag')) {
                    tag = elm.getAttribute('tag');
                }

                family = elm.getAttribute('face');
                if (Dom.getStyle(elm, 'font-family')) {
                    family = Dom.getStyle(elm, 'font-family');
                }

                if (tag.substring(0, 1) == 'h') {
                    if (hd_button) {
                        for (var h = 0; h < hd_button._configs.menu.value.length; h++) {
                            if (hd_button._configs.menu.value[h].value.toLowerCase() == tag) {
                                hd_button.set('label', hd_button._configs.menu.value[h].text);
                            }
                        }
                        this._updateMenuChecked('heading', tag);
                    }
                }
            }

            if (fn_button) {
                for (var b = 0; b < fn_button._configs.menu.value.length; b++) {
                    if (family && fn_button._configs.menu.value[b].text.toLowerCase() == family.toLowerCase()) {
                        validFont = true;
                        family = fn_button._configs.menu.value[b].text; //Put the proper menu name in the button
                    }
                }
                if (!validFont) {
                    family = fn_button._configs.label._initialConfig.value;
                }
                var familyLabel = '<span class="yui-toolbar-fontname-' + _cleanClassName(family) + '">' + family + '</span>';
                if (fn_button.get('label') != familyLabel) {
                    fn_button.set('label', familyLabel);
                    this._updateMenuChecked('fontname', family);
                }
            }

            if (fs_button) {
                fontsize = parseInt(Dom.getStyle(elm, 'fontSize'), 10);
                if ((fontsize === null) || isNaN(fontsize)) {
                    fontsize = fs_button._configs.label._initialConfig.value;
                }
                fs_button.set('label', ''+fontsize);
            }
            
            if (!this._isElement(elm, 'body') && !this._isElement(elm, 'img')) {
                this.toolbar.enableButton(fn_button);
                this.toolbar.enableButton(fs_button);
                this.toolbar.enableButton('forecolor');
                this.toolbar.enableButton('backcolor');
            }
            if (this._isElement(elm, 'img')) {
                if (YAHOO.widget.Overlay) {
                    this.toolbar.enableButton('createlink');
                }
            }
            if (this._isElement(elm, 'blockquote')) {
                this.toolbar.selectButton('indent');
                this.toolbar.disableButton('indent');
                this.toolbar.enableButton('outdent');
            }
            if (this._isElement(elm, 'ol') || this._isElement(elm, 'ul') || this._isElement(elm, 'li')) {
                this.toolbar.disableButton('indent');
            }
            this._lastButton = null;
            
        },
        _setBusy: function(off) {
            /*
            if (off) {
                Dom.removeClass(document.body, 'yui-busy');
                Dom.removeClass(this._getDoc().body, 'yui-busy');
            } else {
                Dom.addClass(document.body, 'yui-busy');
                Dom.addClass(this._getDoc().body, 'yui-busy');
            }
            */
        },
        /**
        * @private
        * @method _handleInsertImageClick
        * @description Opens the Image Properties Window when the insert Image button is clicked or an Image is Double Clicked.
        */
        _handleInsertImageClick: function() {
            this.toolbar.set('disabled', true); //Disable the toolbar when the prompt is showing
            this.on('afterExecCommand', function() {
                var el = this.currentElement[0],
                    src = 'http://';
                if (!el) {
                    el = this._getSelectedElement();
                }
                if (el) {
                    if (el.getAttribute('src')) {
                        src = el.getAttribute('src', 2);
                        if (src.indexOf(this.get('blankimage')) != -1) {
                            src = this.STR_IMAGE_HERE;
                        }
                    }
                }
                var str = prompt(this.STR_LINK_URL + ': ', src);
                if ((str !== '') && (str !== null)) {
                    el.setAttribute('src', str);
                } else if (str !== null) {
                    el.parentNode.removeChild(el);
                    this.currentElement = [];
                }
                this.closeWindow();
                this.toolbar.set('disabled', false);
            }, this, true);
        },
        /**
        * @private
        * @method _handleInsertImageWindowClose
        * @description Handles the closing of the Image Properties Window.
        */
        _handleInsertImageWindowClose: function() {
            this.nodeChange();
        },
        /**
        * @private
        * @method _isLocalFile
        * @param {String} url THe url/string to check
        * @description Checks to see if a string (href or img src) is possibly a local file reference..
        */
        _isLocalFile: function(url) {
            if ((url !== '') && ((url.indexOf('file:/') != -1) || (url.indexOf(':\\') != -1))) {
                return true;
            }
            return false;
        },
        /**
        * @private
        * @method _handleCreateLinkClick
        * @description Handles the opening of the Link Properties Window when the Create Link button is clicked or an href is doubleclicked.
        */
        _handleCreateLinkClick: function() {
            this.toolbar.set('disabled', true); //Disable the toolbar when the prompt is showing
            this.on('afterExecCommand', function() {
                var el = this.currentElement[0],
                    url = '',
                    localFile = false;

                if (el) {
                    if (el.getAttribute('href') !== null) {
                        url = el.getAttribute('href', 2);
                    }
                }
                var str = prompt(this.STR_LINK_URL + ': ', url);
                if ((str !== '') && (str !== null)) {
                    var urlValue = str;
                    if ((urlValue.indexOf(':/'+'/') == -1) && (urlValue.substring(0,1) != '/') && (urlValue.substring(0, 6).toLowerCase() != 'mailto')) {
                        if ((urlValue.indexOf('@') != -1) && (urlValue.substring(0, 6).toLowerCase() != 'mailto')) {
                            //Found an @ sign, prefix with mailto:
                            urlValue = 'mailto:' + urlValue;
                        } else {
                            /* :// not found adding */
                            urlValue = 'http:/'+'/' + urlValue;
                        }
                    }
                    el.setAttribute('href', urlValue);
                } else if (str !== null) {
                    var _span = this._getDoc().createElement('span');
                    _span.innerHTML = el.innerHTML;
                    Dom.addClass(_span, 'yui-non');
                    el.parentNode.replaceChild(_span, el);
                }
                this.closeWindow();
                this.toolbar.set('disabled', false);
            });
        },
        /**
        * @private
        * @method _handleCreateLinkWindowClose
        * @description Handles the closing of the Link Properties Window.
        */
        _handleCreateLinkWindowClose: function() {
            this.nodeChange();
            this.currentElement = [];
        },
        /**
        * @method render
        * @description Causes the toolbar and the editor to render and replace the textarea.
        */
        render: function() {
            if (this._rendered) {
                return false;
            }
            YAHOO.log('Render', 'info', 'SimpleEditor');
            if (!this.DOMReady) {
                this._queue[this._queue.length] = ['render', arguments];
                return false;
            }
            this._setBusy();
            this._rendered = true;
            var self = this;

            this.set('textarea', this.get('element'));

            this.get('element_cont').setStyle('display', 'none');
            this.get('element_cont').addClass(this.CLASS_CONTAINER);

            this.set('iframe', this._createIframe());
            window.setTimeout(function() {
                self._setInitialContent.call(self);
            }, 10);

            this.get('editor_wrapper').appendChild(this.get('iframe').get('element'));
            Dom.addClass(this.get('iframe').get('parentNode'), this.CLASS_EDITABLE_CONT);
            this.get('iframe').addClass(this.CLASS_EDITABLE);

            if (this.get('disabled')) {
                this._disableEditor(true);
            }

            var tbarConf = this.get('toolbar');
            //Create Toolbar instance
            if (tbarConf instanceof Toolbar) {
                this.toolbar = tbarConf;
                //Set the toolbar to disabled until content is loaded
                this.toolbar.set('disabled', true);
            } else {
                //Set the toolbar to disabled until content is loaded
                tbarConf.disabled = true;
                this.toolbar = new Toolbar(this.get('toolbar_cont'), tbarConf);
            }

            YAHOO.log('fireEvent::toolbarLoaded', 'info', 'SimpleEditor');
            this.fireEvent('toolbarLoaded', { type: 'toolbarLoaded', target: this.toolbar });

            
            this.toolbar.on('toolbarCollapsed', function() {
                if (this.currentWindow) {
                    this.moveWindow();
                }
            }, this, true);
            this.toolbar.on('toolbarExpanded', function() {
                if (this.currentWindow) {
                    this.moveWindow();
                }
            }, this, true);
            this.toolbar.on('fontsizeClick', function(o) {
                this._handleFontSize(o);
            }, this, true);
            
            this.toolbar.on('colorPickerClicked', function(o) {
                this._handleColorPicker(o);
            }, this, true);

            this.toolbar.on('alignClick', function(o) {
                this._handleAlign(o);
            }, this, true);
            this.on('afterNodeChange', function() {
                this._handleAfterNodeChange();
            }, this, true);
            this.toolbar.on('insertimageClick', function() {
                this._handleInsertImageClick();
            }, this, true);
            this.on('windowinsertimageClose', function() {
                this._handleInsertImageWindowClose();
            }, this, true);
            this.toolbar.on('createlinkClick', function() {
                this._handleCreateLinkClick();
            }, this, true);
            this.on('windowcreatelinkClose', function() {
                this._handleCreateLinkWindowClose();
            }, this, true);
            

            //Replace Textarea with editable area
            
            this.get('parentNode').replaceChild(this.get('element_cont').get('element'), this.get('element'));

            
            if (!this.beforeElement) {
                this.beforeElement = document.createElement('h2');
                this.beforeElement.className = 'yui-editor-skipheader';
                this.beforeElement.tabIndex = '-1';
                this.beforeElement.innerHTML = this.STR_BEFORE_EDITOR;
                this.get('element_cont').get('firstChild').insertBefore(this.beforeElement, this.toolbar.get('nextSibling'));
            }

            this.setStyle('visibility', 'hidden');
            this.setStyle('position', 'absolute');
            this.setStyle('top', '-9999px');
            this.setStyle('left', '-9999px');
            this.get('element_cont').appendChild(this.get('element'));
            this.get('element_cont').setStyle('display', 'block');


            //Set height and width of editor container
            this.get('element_cont').setStyle('width', this.get('width'));
            Dom.setStyle(this.get('iframe').get('parentNode'), 'height', this.get('height'));


            this.get('iframe').setStyle('width', '100%'); //WIDTH
            //this.get('iframe').setStyle('_width', '99%'); //WIDTH
            this.get('iframe').setStyle('height', '100%');

            this.fireEvent('afterRender', { type: 'afterRender', target: this });
        },
        /**
        * @method execCommand
        * @param {String} action The "execCommand" action to try to execute (Example: bold, insertimage, inserthtml)
        * @param {String} value (optional) The value for a given action such as action: fontname value: 'Verdana'
        * @description This method attempts to try and level the differences in the various browsers and their support for execCommand actions
        */
        execCommand: function(action, value) {
            var beforeExec = this.fireEvent('beforeExecCommand', { type: 'beforeExecCommand', target: this, args: arguments });
            if ((beforeExec === false) || (this.STOP_EXEC_COMMAND)) {
                this.STOP_EXEC_COMMAND = false;
                return false;
            }
            this._setMarkupType(action);
            if (this.browser.ie) {
                this._getWindow().focus();
            }
            var exec = true;

            this.editorDirty = true;
            
            if (typeof this['cmd_' + action.toLowerCase()] == 'function') {
                YAHOO.log('Found execCommand override method: (cmd_' + action.toLowerCase() + ')', 'info', 'SimpleEditor');
                var retValue = this['cmd_' + action.toLowerCase()](value);
                exec = retValue[0];
                if (retValue[1]) {
                    action = retValue[1];
                }
                if (retValue[2]) {
                    value = retValue[2];
                }
            }
            if (exec) {
                YAHOO.log('execCommand::(' + action + '), (' + value + ')', 'info', 'SimpleEditor');
                try {
                    this._getDoc().execCommand(action, false, value);
                } catch(e) {
                    YAHOO.log('execCommand Failed', 'error', 'SimpleEditor');
                }
            } else {
                YAHOO.log('OVERRIDE::execCommand::(' + action + '),(' + value + ') skipped', 'warn', 'SimpleEditor');
            }
            this.on('afterExecCommand', function() {
                this.unsubscribeAll('afterExecCommand');
                this.nodeChange();
            });
            this.fireEvent('afterExecCommand', { type: 'afterExecCommand', target: this });
            
        },
    /* {{{  Command Overrides */

        /**
        * @method cmd_heading
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('heading') is used.
        */
        cmd_heading: function(value) {
            var exec = true,
                el = null,
                action = 'heading',
                _sel = this._getSelection(),
                _selEl = this._getSelectedElement();

            if (_selEl) {
                _sel = _selEl;
            }
            
            if (this.browser.ie) {
                action = 'formatblock';
            }
            if (value == 'none') {
                if ((_sel && _sel.tagName && (_sel.tagName.toLowerCase().substring(0,1) == 'h')) || (_sel && _sel.parentNode && _sel.parentNode.tagName && (_sel.parentNode.tagName.toLowerCase().substring(0,1) == 'h'))) {
                    if (_sel.parentNode.tagName.toLowerCase().substring(0,1) == 'h') {
                        _sel = _sel.parentNode;
                    }
                    el = this._swapEl(_selEl, 'span', function(el) {
                        el.className = 'yui-non';
                    });
                    this._selectNode(el);
                    this.currentElement[0] = el;
                }
                exec = false;
            } else {
                if (this.browser.ie || this.browser.webkit || this.browser.opera) {
                    if (this._isElement(_selEl, 'h1') || this._isElement(_selEl, 'h2') || this._isElement(_selEl, 'h3') || this._isElement(_selEl, 'h4') || this._isElement(_selEl, 'h5') || this._isElement(_selEl, 'h6')) {
                        el = this._swapEl(_selEl, value);
                        this._selectNode(el);
                        this.currentElement[0] = el;
                    } else {
                        this._createCurrentElement(value);
                        this._selectNode(this.currentElement[0]);
                    }
                    exec = false;
                }
            }
            return [exec, action];
        },
        /**
        * @method cmd_backcolor
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('backcolor') is used.
        */
        cmd_backcolor: function(value) {
            var exec = true,
                el = this._getSelectedElement(),
                action = 'backcolor';

            if (this.browser.gecko || this.browser.opera) {
                this._setEditorStyle(true);
                action = 'hilitecolor';
            }
            /**
            * @browser opera
            * @knownissue - Opera fails to assign a background color on an element that already has one.
            */
            if (this.browser.opera) {
                if (!this._isElement(el, 'body') && Dom.getStyle(el, 'background-color')) {
                    Dom.setStyle(el, 'background-color', value);
                } else {
                    this._createCurrentElement('span', { backgroundColor: value });
                }
                exec = false;
            } else if (!this._hasSelection()) {
                if (el !== this._getDoc().body) {
                    Dom.setStyle(el, 'background-color', value);
                    exec = false;
                }
            }
            return [exec, action];
        },
        /**
        * @method cmd_forecolor
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('forecolor') is used.
        */
        cmd_forecolor: function(value) {
            var exec = true,
                el = this._getSelectedElement();

                if ((el !== this._getDoc().body) && (!this._hasSelection())) {
                    Dom.setStyle(el, 'color', value);
                    exec = false;
                }
                return [exec];
        },
        /**
        * @method cmd_hiddenelements
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('hiddenelements') is used.
        */
        cmd_hiddenelements: function(value) {
            this._showHidden();
            return [false];
        },
        /**
        * @method cmd_unlink
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('unlink') is used.
        */
        cmd_unlink: function(value) {
            var el = this._swapEl(this.currentElement[0], 'span', function(el) {
                el.className = 'yui-non';
            });
            return [false];
        },
        /**
        * @method cmd_createlink
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('createlink') is used.
        */
        cmd_createlink: function(value) {
            var el = this._getSelectedElement(), _a = null;
            if (!this._isElement(el, 'a')) {
                this._createCurrentElement('a');
                _a = this._swapEl(this.currentElement[0], 'a');
                this.currentElement[0] = _a;
            } else {
                this.currentElement[0] = el;
            }
            return [false];
        },
        /**
        * @method cmd_insertimage
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('insertimage') is used.
        */
        cmd_insertimage: function(value) {
            var exec = true, _img = null, action = 'insertimage',
                el = this._getSelectedElement();

            if (value === '') {
                value = this.get('blankimage');
            }

            /**
            * @knownissue
            * @browser Safari 2.x
            * @description The issue here is that we have no way of knowing where the cursor position is
            * inside of the iframe, so we have to place the newly inserted data in the best place that we can.
            */
            
            YAHOO.log('InsertImage: ' + el.tagName, 'info', 'SimpleEditor');
            if (this._isElement(el, 'img')) {
                this.currentElement[0] = el;
                exec = false;
            } else {
                if (this._getDoc().queryCommandEnabled(action)) {
                    this._getDoc().execCommand('insertimage', false, value);
                    var imgs = this._getDoc().getElementsByTagName('img');
                    for (var i = 0; i < imgs.length; i++) {
                        if (!YAHOO.util.Dom.hasClass(imgs[i], 'yui-img')) {
                            YAHOO.util.Dom.addClass(imgs[i], 'yui-img');
                            this.currentElement[0] = imgs[i];
                        }
                    }
                    exec = false;
                } else {
                    if (el == this._getDoc().body) {
                        _img = this._getDoc().createElement('img');
                        _img.setAttribute('src', value);
                        YAHOO.util.Dom.addClass(_img, 'yui-img');
                        this._getDoc().body.appendChild(_img);
                    } else {
                        this._createCurrentElement('img');
                        _img = this._getDoc().createElement('img');
                        _img.setAttribute('src', value);
                        YAHOO.util.Dom.addClass(_img, 'yui-img');
                        this.currentElement[0].parentNode.replaceChild(_img, this.currentElement[0]);
                    }
                    this.currentElement[0] = _img;
                    exec = false;
                }
            }
            return [exec];
        },
        /**
        * @method cmd_inserthtml
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('inserthtml') is used.
        */
        cmd_inserthtml: function(value) {
            var exec = true, action = 'inserthtml', _span = null, _range = null;
            /**
            * @knownissue
            * @browser Safari 2.x
            * @description The issue here is that we have no way of knowing where the cursor position is
            * inside of the iframe, so we have to place the newly inserted data in the best place that we can.
            */
            if (this.browser.webkit && !this._getDoc().queryCommandEnabled(action)) {
                YAHOO.log('More Safari DOM tricks (inserthtml)', 'info', 'EditorSafari');
                this._createCurrentElement('img');
                _span = this._getDoc().createElement('span');
                _span.innerHTML = value;
                this.currentElement[0].parentNode.replaceChild(_span, this.currentElement[0]);
                exec = false;
            } else if (this.browser.ie) {
                _range = this._getRange();
                if (_range.item) {
                    _range.item(0).outerHTML = value;
                } else {
                    _range.pasteHTML(value);
                }
                exec = false;                    
            }
            return [exec];
        },
        /**
        * @method cmd_removeformat
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('removeformat') is used.
        */
        cmd_removeformat: function(value) {
            var exec = true;
            /**
            * @knownissue Remove Format issue
            * @browser Safari 2.x
            * @description There is an issue here with Safari, that it may not always remove the format of the item that is selected.
            * Due to the way that Safari 2.x handles ranges, it is very difficult to determine what the selection holds.
            * So here we are making the best possible guess and acting on it.
            */
            if (this.browser.webkit && !this._getDoc().queryCommandEnabled('removeformat')) {
                this._createCurrentElement('span');
                YAHOO.util.Dom.addClass(this.currentElement[0], 'yui-non');
                var re= /<\S[^><]*>/g;
                var str = this.currentElement[0].innerHTML.replace(re, '');
                var _txt = this._getDoc().createTextNode(str);
                this.currentElement[0].parentNode.parentNode.replaceChild(_txt, this.currentElement[0].parentNode);
                
                exec = false;
            }
            return [exec];
        },
        /**
        * @method cmd_script
        * @param action action passed from the execCommand method
        * @param value Value passed from the execCommand method
        * @description This is a combined execCommand override method. It is called from the cmd_superscript and cmd_subscript methods.
        */
        cmd_script: function(action, value) {
            var exec = true, tag = action.toLowerCase().substring(0, 3),
                _span = null, _selEl = this._getSelectedElement();

            if (this.browser.webkit) {
                YAHOO.log('Safari dom fun again (' + action + ')..', 'info', 'EditorSafari');
                if (this._isElement(_selEl, tag)) {
                    YAHOO.log('we are a child of tag (' + tag + '), reverse process', 'info', 'EditorSafari');
                    _span = this._swapEl(this.currentElement[0], 'span', function(el) {
                        el.className = 'yui-non';
                    });
                    this._selectNode(_span);
                } else {
                    this._createCurrentElement(tag);
                    var _sub = this._swapEl(this.currentElement[0], tag);
                    this._selectNode(_sub);
                    this.currentElement[0] = _sub;
                }
                exec = false;
            }
            return exec;
        },
        /**
        * @method cmd_superscript
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('superscript') is used.
        */
        cmd_superscript: function(value) {
            return [this.cmd_script('superscript', value)];
        },
        /**
        * @method cmd_subscript
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('subscript') is used.
        */
        cmd_subscript: function(value) {
            return [this.cmd_script('subscript', value)];
        },
        /**
        * @method cmd_indent
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('indent') is used.
        */
        cmd_indent: function(value) {
            var exec = true, selEl = this._getSelectedElement(), _bq = null;

            if (this.browser.webkit || this.browser.ie || this.browser.gecko) {
                if (this._isElement(selEl, 'blockquote')) {
                    _bq = this._getDoc().createElement('blockquote');
                    _bq.innerHTML = selEl.innerHTML;
                    selEl.innerHTML = '';
                    selEl.appendChild(_bq);
                    this._selectNode(_bq);
                } else {
                    this._createCurrentElement('blockquote');
                    for (var i = 0; i < this.currentElement.length; i++) {
                        _bq = this._getDoc().createElement('blockquote');
                        _bq.innerHTML = this.currentElement[i].innerHTML;
                        this.currentElement[i].parentNode.replaceChild(_bq, this.currentElement[i]);
                        this.currentElement[i] = _bq;
                    }
                    this._selectNode(this.currentElement[0]);
                }
                exec = false;
            } else {
                value = 'blockquote';
            }
            return [exec, 'indent', value];
        },
        /**
        * @method cmd_outdent
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('outdent') is used.
        */
        cmd_outdent: function(value) {
            var exec = true, selEl = this._getSelectedElement(), _bq = null, _span = null;
            if (this.browser.webkit || this.browser.ie || this.browser.gecko) {
                selEl = this._getSelectedElement();
                if (this._isElement(selEl, 'blockquote')) {
                    var par = selEl.parentNode;
                    if (this._isElement(selEl.parentNode, 'blockquote')) {
                        par.innerHTML = selEl.innerHTML;
                        this._selectNode(par);
                    } else {
                        _span = this._getDoc().createElement('span');
                        _span.innerHTML = selEl.innerHTML;
                        YAHOO.util.Dom.addClass(_span, 'yui-non');
                        par.replaceChild(_span, selEl);
                        this._selectNode(_span);
                    }
                } else {
                    YAHOO.log('Can not outdent, we are not inside a blockquote', 'warn', 'SimpleEditor');
                }
                exec = false;
            } else {
                value = 'blockquote';
            }
            return [exec, 'indent', value];
        },
        /**
        * @method cmd_list
        * @param tag The tag of the list you want to create (eg, ul or ol)
        * @description This is a combined execCommand override method. It is called from the cmd_insertorderedlist and cmd_insertunorderedlist methods.
        */
        cmd_list: function(tag) {
            var exec = true, list = null, li = 0, el = null, str = '',
                selEl = this._getSelectedElement(), action = 'insertorderedlist';
                if (tag == 'ul') {
                    action = 'insertunorderedlist';
                }
            /**
            * @knownissue Safari 2.+ doesn't support ordered and unordered lists
            * @browser Safari 2.x
            * The issue with this workaround is that when applied to a set of text
            * that has BR's in it, Safari may or may not pick up the individual items as
            * list items. This is fixed in WebKit (Safari 3)
            */
            if ((this.browser.webkit && !this._getDoc().queryCommandEnabled(action))) {
                if (this._isElement(selEl, 'li') && this._isElement(selEl.parentNode, tag)) {
                    YAHOO.log('We already have a list, undo it', 'info', 'SimpleEditor');
                    el = selEl.parentNode;
                    list = this._getDoc().createElement('span');
                    YAHOO.util.Dom.addClass(list, 'yui-non');
                    str = '';
                    var lis = el.getElementsByTagName('li');
                    for (li = 0; li < lis.length; li++) {
                        str += '<div>' + lis[li].innerHTML + '</div>';
                    }
                    list.innerHTML = str;
                    this.currentElement[0] = el;
                } else {
                    YAHOO.log('Create list item', 'info', 'SimpleEditor');
                    this._createCurrentElement(tag.toLowerCase());
                    list = this._getDoc().createElement(tag);
                    var els = this.currentElement;
                    for (li = 0; li < this.currentElement.length; li++) {
                        var newli = this._getDoc().createElement('li');
                        newli.innerHTML = this.currentElement[li].innerHTML + '&nbsp;';
                        list.appendChild(newli);
                        if (li > 0) {
                            this.currentElement[li].parentNode.removeChild(this.currentElement[li]);
                        }
                    }
                }
                this.currentElement[0].parentNode.replaceChild(list, this.currentElement[0]);
                exec = false;
            } else {
                el = this._getSelectedElement();
                if (this._isElement(el, 'li') && this._isElement(el.parentNode, tag) || (this.browser.ie && this._isElement(this._getRange().parentElement, 'li'))) { //we are in a list..
                    YAHOO.log('We already have a list, undo it', 'info', 'SimpleEditor');
                    if (this.browser.ie) {
                        YAHOO.log('Undo IE', 'info', 'SimpleEditor');
                        str = '';
                        var lis2 = el.parentNode.getElementsByTagName('li');
                        for (var j = 0; j < lis2.length; j++) {
                            str += lis2[j].innerHTML + '<br>';
                        }
                        var newEl = this._getDoc().createElement('span');
                        newEl.innerHTML = str;
                        el.parentNode.parentNode.replaceChild(newEl, el.parentNode);
                    } else {
                        this.nodeChange();
                        this._getDoc().execCommand(action, '', el.parentNode);
                        this.nodeChange();
                    }
                    exec = false;
                }
                if (this.browser.opera) {
                    var self = this;
                    window.setTimeout(function() {
                        var liso = self._getDoc().getElementsByTagName('li');
                        for (var i = 0; i < liso.length; i++) {
                            if (liso[i].innerHTML.toLowerCase() == '<br>') {
                                liso[i].parentNode.parentNode.removeChild(liso[i].parentNode);
                            }
                        }
                    },30);
                }
                if (this.browser.ie && exec) {
                    var html = '';
                    if (this._getRange().html) {
                        html = '<li>' + this._getRange().html+ '</li>';
                    } else {
                        html = '<li>' + this._getRange().text + '</li>';
                    }

                    this._getRange().pasteHTML('<' + tag + '>' + html + '</' + tag + '>');
                    exec = false;
                }
            }
            return exec;
        },
        /**
        * @method cmd_insertorderedlist
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('insertorderedlist ') is used.
        */
        cmd_insertorderedlist: function(value) {
            return [this.cmd_list('ol')];
        },
        /**
        * @method cmd_insertunorderedlist 
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('insertunorderedlist') is used.
        */
        cmd_insertunorderedlist: function(value) {
            return [this.cmd_list('ul')];
        },
        /**
        * @method cmd_fontname
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('fontname') is used.
        */
        cmd_fontname: function(value) {
            var exec = true,
                selEl = this._getSelectedElement();

            this.currentFont = value;
            if (selEl && selEl.tagName && !this._hasSelection()) {
                YAHOO.util.Dom.setStyle(selEl, 'font-family', value);
                exec = false;
            }
            return [exec];
        },
        /**
        * @method cmd_fontsize
        * @param value Value passed from the execCommand method
        * @description This is an execCommand override method. It is called from execCommand when the execCommand('fontsize') is used.
        */
        cmd_fontsize: function(value) {
            if ((this.currentElement.length > 0) && (!this._hasSelection())) {
                YAHOO.util.Dom.setStyle(this.currentElement, 'fontSize', value);
            } else if (!this._isElement(this._getSelectedElement(), 'body')) {
                YAHOO.util.Dom.setStyle(this._getSelectedElement(), 'fontSize', value);
            } else {
                this._createCurrentElement('span', {'fontSize': value });
            }
            return [false];
        },
    /* }}} */
        /**
        * @private
        * @method _swapEl
        * @param {HTMLElement} el The element to swap with
        * @param {String} tagName The tagname of the element that you wish to create
        * @param {Function} callback (optional) A function to run on the element after it is created, but before it is replaced. An element reference is passed to this function.
        * @description This function will create a new element in the DOM and populate it with the contents of another element. Then it will assume it's place.
        */
        _swapEl: function(el, tagName, callback) {
            var _el = this._getDoc().createElement(tagName);
            _el.innerHTML = el.innerHTML;
            if (typeof callback == 'function') {
                callback.call(this, _el);
            }
            el.parentNode.replaceChild(_el, el);
            return _el;
        },
        /**
        * @private
        * @method _createCurrentElement
        * @param {String} tagName (optional defaults to a) The tagname of the element that you wish to create
        * @param {Object} tagStyle (optional) Object literal containing styles to apply to the new element.
        * @description This is a work around for the various browser issues with execCommand. This method will run <code>execCommand('fontname', false, 'yui-tmp')</code> on the given selection.
        * It will then search the document for an element with the font-family set to <strong>yui-tmp</strong> and replace that with another span that has other information in it, then assign the new span to the 
        * <code>this.currentElement</code> array, so we now have element references to the elements that were just modified. At this point we can use standard DOM manipulation to change them as we see fit.
        */
        _createCurrentElement: function(tagName, tagStyle) {
            tagName = ((tagName) ? tagName : 'a');
            var sel = this._getSelection(),
                tar = null,
                el = [],
                _doc = this._getDoc();
            
            if (this.currentFont) {
                if (!tagStyle) {
                    tagStyle = {};
                }
                tagStyle.fontFamily = this.currentFont;
                this.currentFont = null;
            }
            this.currentElement = [];

            var _elCreate = function() {
                var el = null;
                switch (tagName) {
                    case 'h1':
                    case 'h2':
                    case 'h3':
                    case 'h4':
                    case 'h5':
                    case 'h6':
                        el = _doc.createElement(tagName);
                        break;
                    default:
                        el = _doc.createElement('span');
                        YAHOO.util.Dom.addClass(el, 'yui-tag-' + tagName);
                        YAHOO.util.Dom.addClass(el, 'yui-tag');
                        el.setAttribute('tag', tagName);

                        for (var k in tagStyle) {
                            if (YAHOO.util.Lang.hasOwnProperty(tagStyle, k)) {
                                el.style[k] = tagStyle[k];
                            }
                        }
                        break;
                }
                return el;
            };

            if (!this._hasSelection()) {
                if (this._getDoc().queryCommandEnabled('insertimage')) {
                    this._getDoc().execCommand('insertimage', false, 'yui-tmp-img');
                    var imgs = this._getDoc().getElementsByTagName('img');
                    for (var j = 0; j < imgs.length; j++) {
                        if (imgs[j].getAttribute('src', 2) == 'yui-tmp-img') {
                            el = _elCreate();
                            imgs[j].parentNode.replaceChild(el, imgs[j]);
                            this.currentElement[this.currentElement.length] = el;
                        }
                    }
                } else {
                    if (this.currentEvent) {
                        tar = YAHOO.util.Event.getTarget(this.currentEvent);
                    } else {
                        //For Safari..
                        tar = this._getDoc().body;                        
                    }
                }
                if (tar) {
                    /**
                    * @knownissue
                    * @browser Safari 2.x
                    * @description The issue here is that we have no way of knowing where the cursor position is
                    * inside of the iframe, so we have to place the newly inserted data in the best place that we can.
                    */
                    el = _elCreate();
                    if (this._isElement(tar, 'body')) {
                        tar.appendChild(el);
                    } else if (tar.nextSibling) {
                        tar.parentNode.insertBefore(el, tar.nextSibling);
                    } else {
                        tar.parentNode.appendChild(el);
                    }
                    //this.currentElement = el;
                    this.currentElement[this.currentElement.length] = el;
                    this.currentEvent = null;
                    if (this.browser.webkit) {
                        //Force Safari to focus the new element
                        this._getSelection().setBaseAndExtent(el, 0, el, 0);
                        if (this.browser.webkit3) {
                            this._getSelection().collapseToStart();
                        } else {
                            this._getSelection().collapse(true);
                        }
                    }
                }
            } else {
                //Force CSS Styling for this action...
                this._setEditorStyle(true);
                this._getDoc().execCommand('fontname', false, 'yui-tmp');
                var _tmp = [];
                /* TODO: This needs to be cleaned up.. */
                var _tmp1 = this._getDoc().getElementsByTagName('font');
                var _tmp2 = this._getDoc().getElementsByTagName(this._getSelectedElement().tagName);
                var _tmp3 = this._getDoc().getElementsByTagName('span');
                var _tmp4 = this._getDoc().getElementsByTagName('i');
                var _tmp5 = this._getDoc().getElementsByTagName('b');
                var _tmp6 = this._getDoc().getElementsByTagName(this._getSelectedElement().parentNode.tagName);
                for (var e1 = 0; e1 < _tmp1.length; e1++) {
                    _tmp[_tmp.length] = _tmp1[e1];
                }
                for (var e6 = 0; e6 < _tmp6.length; e6++) {
                    _tmp[_tmp.length] = _tmp6[e6];
                }
                for (var e2 = 0; e2 < _tmp2.length; e2++) {
                    _tmp[_tmp.length] = _tmp2[e2];
                }
                for (var e3 = 0; e3 < _tmp3.length; e3++) {
                    _tmp[_tmp.length] = _tmp3[e3];
                }
                for (var e4 = 0; e4 < _tmp4.length; e4++) {
                    _tmp[_tmp.length] = _tmp4[e4];
                }
                for (var e5 = 0; e5 < _tmp5.length; e5++) {
                    _tmp[_tmp.length] = _tmp5[e5];
                }
                for (var i = 0; i < _tmp.length; i++) {
                    if ((YAHOO.util.Dom.getStyle(_tmp[i], 'font-family') == 'yui-tmp') || (_tmp[i].face && (_tmp[i].face == 'yui-tmp'))) {
                        el = _elCreate();
                        el.innerHTML = _tmp[i].innerHTML;
                        if (this._isElement(_tmp[i], 'ol') || (this._isElement(_tmp[i], 'ul'))) {
                            var fc = _tmp[i].getElementsByTagName('li')[0];
                            _tmp[i].style.fontFamily = 'inherit';
                            fc.style.fontFamily = 'inherit';
                            el.innerHTML = fc.innerHTML;
                            fc.innerHTML = '';
                            fc.appendChild(el);
                            this.currentElement[this.currentElement.length] = el;
                        } else if (this._isElement(_tmp[i], 'li')) {
                            _tmp[i].innerHTML = '';
                            _tmp[i].appendChild(el);
                            _tmp[i].style.fontFamily = 'inherit';
                            this.currentElement[this.currentElement.length] = el;
                        } else {
                            if (_tmp[i].parentNode) {
                                _tmp[i].parentNode.replaceChild(el, _tmp[i]);
                                this.currentElement[this.currentElement.length] = el;
                                this.currentEvent = null;
                                if (this.browser.webkit) {
                                    //Force Safari to focus the new element
                                    this._getSelection().setBaseAndExtent(el, 0, el, 0);
                                    if (this.browser.webkit3) {
                                        this._getSelection().collapseToStart();
                                    } else {
                                        this._getSelection().collapse(true);
                                    }
                                }
                                if (this.browser.ie && tagStyle && tagStyle.fontSize) {
                                    this._getSelection().empty();
                                }
                                if (this.browser.gecko) {
                                    this._getSelection().collapseToStart();
                                }
                            }
                        }
                    }
                }
                var len = this.currentElement.length;
                for (var e = 0; e < len; e++) {
                    if ((e + 1) != len) { //Skip the last one in the list
                        if (this.currentElement[e] && this.currentElement[e].nextSibling) {
                            if (this._isElement(this.currentElement[e], 'br')) {
                                this.currentElement[this.currentElement.length] = this.currentElement[e].nextSibling;
                            }
                        }
                    }
                }
            }
        },
        /**
        * @method saveHTML
        * @description Cleans the HTML with the cleanHTML method then places that string back into the textarea.
        */
        saveHTML: function() {
            var html = this.cleanHTML();
            this.get('element').value = html;
            return html;
        },
        /**
        * @method setEditorHTML
        * @param {String} html The html content to load into the editor
        * @description Loads HTML into the editors body
        */
        setEditorHTML: function(html) {
            this._getDoc().body.innerHTML = html;
            this.nodeChange();
        },
        /**
        * @method getEditorHTML
        * @description Gets the unprocessed/unfiltered HTML from the editor
        */
        getEditorHTML: function() {
            return this._getDoc().body.innerHTML;
        },
        /**
        * @method show
        * @description This method needs to be called if the Editor was hidden (like in a TabView or Panel). It is used to reset the editor after being in a container that was set to display none.
        */
        show: function() {
            if (this.browser.gecko) {
                this._setDesignMode('on');
                this._focusWindow();
            }
            if (this.browser.webkit) {
                var self = this;
                window.setTimeout(function() {
                    self._setInitialContent.call(self);
                }, 10);
            }
            //Adding this will close all other Editor window's when showing this one.
            if (YAHOO.widget.EditorInfo.window.win && YAHOO.widget.EditorInfo.window.scope) {
                YAHOO.widget.EditorInfo.window.scope.closeWindow.call(YAHOO.widget.EditorInfo.window.scope);
            }
            //Put the iframe back in place
            this.get('iframe').setStyle('position', 'static');
            this.get('iframe').setStyle('left', '');
        },
        /**
        * @method hide
        * @description This method needs to be called if the Editor is to be hidden (like in a TabView or Panel). It should be called to clear timeouts and close open editor windows.
        */
        hide: function() {
            //Adding this will close all other Editor window's.
            if (YAHOO.widget.EditorInfo.window.win && YAHOO.widget.EditorInfo.window.scope) {
                YAHOO.widget.EditorInfo.window.scope.closeWindow.call(YAHOO.widget.EditorInfo.window.scope);
            }
            if (this._fixNodesTimer) {
                clearTimeout(this._fixNodesTimer);
                this._fixNodesTimer = null;
            }
            if (this._nodeChangeTimer) {
                clearTimeout(this._nodeChangeTimer);
                this._nodeChangeTimer = null;
            }
            this._lastNodeChange = 0;
            //Move the iframe off of the screen, so that in containers with visiblity hidden, IE will not cover other elements.
            this.get('iframe').setStyle('position', 'absolute');
            this.get('iframe').setStyle('left', '-9999px');
        },
        /**
        * @method cleanHTML
        * @param {String} html The unfiltered HTML
        * @description Process the HTML with a few regexes to clean it up and stabilize the output
        * @returns {String} The filtered HTML
        */
        cleanHTML: function(html) {
            //Start Filtering Output
            //Begin RegExs..
            if (!html) { 
                html = this.getEditorHTML();
            }
            var markup = this.get('markup');
            //Make some backups...
            if (this.browser.webkit) {
		        html = html.replace(/<br class="khtml-block-placeholder">/gi, '<YUI_BR>');
		        html = html.replace(/<br class="webkit-block-placeholder">/gi, '<YUI_BR>');
            }
		    html = html.replace(/<br>/gi, '<YUI_BR>');
		    html = html.replace(/<br\/>/gi, '<YUI_BR>');
		    html = html.replace(/<br \/>/gi, '<YUI_BR>');
		    html = html.replace(/<div><YUI_BR><\/div>/gi, '<YUI_BR>');
		    html = html.replace(/<p>(&nbsp;|&#160;)<\/p>/g, '<YUI_BR>');            
		    html = html.replace(/<p><br>&nbsp;<\/p>/gi, '<YUI_BR>');
		    html = html.replace(/<p>&nbsp;<\/p>/gi, '<YUI_BR>');
		    html = html.replace(/<img([^>]*)\/>/gi, '<YUI_IMG$1>');
		    html = html.replace(/<img([^>]*)>/gi, '<YUI_IMG$1>');
		    html = html.replace(/<ul([^>]*)>/gi, '<YUI_UL$1>');
		    html = html.replace(/<\/ul>/gi, '<\/YUI_UL>');
		    html = html.replace(/<blockquote([^>]*)>/gi, '<YUI_BQ$1>');
		    html = html.replace(/<\/blockquote>/gi, '<\/YUI_BQ>');

            //Convert b and i tags to strong and em tags
            if ((markup == 'semantic') || (markup == 'xhtml')) {
                html = html.replace(/<i([^>]*)>/gi, '<em$1>');
                html = html.replace(/<\/i>/gi, '</em>');
                html = html.replace(/<b([^>]*)>/gi, '<strong$1>');
                html = html.replace(/<\/b>/gi, '</strong>');
            }
            
            //Case Changing
		    html = html.replace(/<font/gi, '<font');
		    html = html.replace(/<\/font>/gi, '</font>');
		    html = html.replace(/<span/gi, '<span');
		    html = html.replace(/<\/span>/gi, '</span>');
            if ((markup == 'semantic') || (markup == 'xhtml') || (markup == 'css')) {
                html = html.replace(new RegExp('<font([^>]*)face="([^>]*)">(.*?)<\/font>', 'gi'), '<span $1 style="font-family: $2;">$3</span>');
                html = html.replace(/<u/gi, '<span style="text-decoration: underline;"');
                html = html.replace(/\/u>/gi, '/span>');
                if (markup == 'css') {
                    html = html.replace(/<em([^>]*)>/gi, '<i$1>');
                    html = html.replace(/<\/em>/gi, '</i>');
                    html = html.replace(/<strong([^>]*)>/gi, '<b$1>');
                    html = html.replace(/<\/strong>/gi, '</b>');
                    html = html.replace(/<b/gi, '<span style="font-weight: bold;"');
                    html = html.replace(/\/b>/gi, '/span>');
                    html = html.replace(/<i/gi, '<span style="font-style: italic;"');
                    html = html.replace(/\/i>/gi, '/span>');
                }
                html = html.replace(/  /gi, ' '); //Replace all double spaces and replace with a single
            } else {
		        html = html.replace(/<u/gi, '<u');
		        html = html.replace(/\/u>/gi, '/u>');
            }
		    html = html.replace(/<ol([^>]*)>/gi, '<ol$1>');
		    html = html.replace(/\/ol>/gi, '/ol>');
		    html = html.replace(/<li/gi, '<li');
		    html = html.replace(/\/li>/gi, '/li>');

            //Fix stuff we don't want
	        html = html.replace(/<\/?(body|head|html)[^>]*>/gi, '');
            //Fix last BR
	        html = html.replace(/<YUI_BR>$/, '');
            //Fix last BR in P
	        html = html.replace(/<YUI_BR><\/p>/g, '</p>');
            //Fix last BR in LI
		    html = html.replace(/<YUI_BR><\/li>/gi, '</li>');

            //Safari only regexes
            if (this.browser.webkit) {
                //<DIV><SPAN class="Apple-style-span" style="line-height: normal;">Test THis</SPAN></DIV>
                html = html.replace(/Apple-style-span/gi, '');
                html = html.replace(/style="line-height: normal;"/gi, '');
                //Remove bogus LI's
                html = html.replace(/<li><\/li>/gi, '');
                html = html.replace(/<li> <\/li>/gi, '');
                //Remove bogus DIV's
                html = html.replace(/<div><\/div>/gi, '');
                html = html.replace(/<div> <\/div>/gi, '');
            }

		    html = html.replace(/yui-tag-span/gi, '');
		    html = html.replace(/yui-tag/gi, '');
		    html = html.replace(/yui-non/gi, '');
		    html = html.replace(/yui-img/gi, '');
		    html = html.replace(/ tag="span"/gi, '');
		    html = html.replace(/ class=""/gi, '');
		    html = html.replace(/ style=""/gi, '');
		    html = html.replace(/ class=" "/gi, '');
		    html = html.replace(/ class="  "/gi, '');
		    html = html.replace(/ target=""/gi, '');
		    html = html.replace(/ title=""/gi, '');
            for (var i = 0; i < 5; i++) {
                html = html.replace(new RegExp('<span>(.*?)<\/span>', 'gi'), '$1');
            }

            if (this.browser.ie) {
		        html = html.replace(/ class= /gi, '');
		        html = html.replace(/ class= >/gi, '');
		        html = html.replace(/_height="([^>])"/gi, '');
		        html = html.replace(/_width="([^>])"/gi, '');
            }
            
            //Replace our backups with the real thing
            if (markup == 'xhtml') {
		        html = html.replace(/<YUI_BR>/g, '<br/>');
		        html = html.replace(/<YUI_IMG([^>]*)>/g, '<img $1/>');
            } else {
		        html = html.replace(/<YUI_BR>/g, '<br>');
		        html = html.replace(/<YUI_IMG([^>]*)>/g, '<img $1>');
            }
		    html = html.replace(/<YUI_UL([^>]*)>/g, '<ul$1>');
		    html = html.replace(/<\/YUI_UL>/g, '<\/ul>');
		    html = html.replace(/<YUI_BQ([^>]*)>/g, '<blockquote$1>');
		    html = html.replace(/<\/YUI_BQ>/g, '<\/blockquote>');

            //Trim the output, removing whitespace from the beginning and end
            html = html.replace(/^\s+/g, '').replace(/\s+$/g, '');

            if (this.get('removeLineBreaks')) {
                html = html.replace(/\n/g, '').replace(/\r/g, '');
                html = html.replace(/  /gi, ' '); //Replace all double spaces and replace with a single
            }
            return html;
        },
        /**
        * @method clearEditorDoc
        * @description Clear the doc of the Editor
        */
        clearEditorDoc: function() {
            this._getDoc().body.innerHTML = '&nbsp;';
        },
        /**
        * @private
        * @method _renderPanel
        * @description Override Method for Advanced Editor
        */
        _renderPanel: function() {
        },
        /**
        * @method openWindow
        * @description Override Method for Advanced Editor
        */
        openWindow: function(win) {
        },
        /**
        * @method moveWindow
        * @description Override Method for Advanced Editor
        */
        moveWindow: function() {
        },
        /**
        * @private
        * @method _closeWindow
        * @description Override Method for Advanced Editor
        */
        _closeWindow: function() {
        },
        /**
        * @method closeWindow
        * @description Override Method for Advanced Editor
        */
        closeWindow: function() {
            this.unsubscribeAll('afterExecCommand');
            this.toolbar.resetAllButtons();
            this._focusWindow();        
        },
        /**
        * @method destroy
        * @description Destroys the editor, all of it's elements and objects.
        * @return {Boolean}
        */
        destroy: function() {
            this.saveHTML();
            this.toolbar.destroy();
            this.setStyle('visibility', 'hidden');
            this.setStyle('position', 'absolute');
            this.setStyle('top', '-9999px');
            this.setStyle('left', '-9999px');
            var textArea = this.get('element');
            this.get('element_cont').get('parentNode').replaceChild(textArea, this.get('element_cont').get('element'));
            this.get('element_cont').get('element').innerHTML = '';
            //Brutal Object Destroy
            for (var i in this) {
                if (Lang.hasOwnProperty(this, i)) {
                    this[i] = null;
                }
            }
            return true;
        },        
        /**
        * @method toString
        * @description Returns a string representing the editor.
        * @return {String}
        */
        toString: function() {
            var str = 'SimpleEditor';
            if (this.get && this.get('element_cont')) {
                str = 'SimpleEditor (#' + this.get('element_cont').get('id') + ')' + ((this.get('disabled') ? ' Disabled' : ''));
            }
            return str;
        }
    });

/**
* @event toolbarLoaded
* @description Event is fired during the render process directly after the Toolbar is loaded. Allowing you to attach events to the toolbar. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event afterRender
* @description Event is fired after the render process finishes. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event editorContentLoaded
* @description Event is fired after the editor iframe's document fully loads and fires it's onload event. From here you can start injecting your own things into the document. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event editorMouseUp
* @param {Event} ev The DOM Event that occured
* @description Passed through HTML Event. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event editorMouseDown
* @param {Event} ev The DOM Event that occured
* @description Passed through HTML Event. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event editorDoubleClick
* @param {Event} ev The DOM Event that occured
* @description Passed through HTML Event. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event editorKeyUp
* @param {Event} ev The DOM Event that occured
* @description Passed through HTML Event. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event editorKeyPress
* @param {Event} ev The DOM Event that occured
* @description Passed through HTML Event. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event editorKeyDown
* @param {Event} ev The DOM Event that occured
* @description Passed through HTML Event. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event beforeNodeChange
* @description Event fires at the beginning of the nodeChange process. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event afterNodeChange
* @description Event fires at the end of the nodeChange process. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event beforeExecCommand
* @description Event fires at the beginning of the execCommand process. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/
/**
* @event afterExecCommand
* @description Event fires at the end of the execCommand process. See <a href="YAHOO.util.Element.html#addListener">Element.addListener</a> for more information on listening for this event.
* @type YAHOO.util.CustomEvent
*/

/**
     * @description Singleton object used to track the open window objects and panels across the various open editors
     * @class EditorInfo
     * @static
    */
    YAHOO.widget.EditorInfo = {
        /**
        * @private
        * @property _instances
        * @description A reference to all editors on the page.
        * @type Object
        */
        _instances: {},
        /**
        * @private
        * @property window
        * @description A reference to the currently open window object in any editor on the page.
        * @type Object <a href="YAHOO.widget.EditorWindow.html">YAHOO.widget.EditorWindow</a>
        */
        window: {},
        /**
        * @private
        * @property panel
        * @description A reference to the currently open panel in any editor on the page.
        * @type Object <a href="YAHOO.widget.Overlay.html">YAHOO.widget.Overlay</a>
        */
        panel: null,
        /**
        * @method getEditorById
        * @description Returns a reference to the Editor object associated with the given textarea
        * @param {String/HTMLElement} id The id or reference of the textarea to return the Editor instance of
        * @returns Object <a href="YAHOO.widget.Editor.html">YAHOO.widget.Editor</a>
        */
        getEditorById: function(id) {
            if (!YAHOO.lang.isString(id)) {
                //Not a string, assume a node Reference
                id = id.id;
            }
            if (this._instances[id]) {
                return this._instances[id];
            }
            return false;
        },
        /**
        * @method toString
        * @description Returns a string representing the EditorInfo.
        * @return {String}
        */
        toString: function() {
            var len = 0;
            for (var i in this._instances) {
                len++;
            }
            return 'Editor Info (' + len + ' registered intance' + ((len > 1) ? 's' : '') + ')';
        }
    };



    
})();