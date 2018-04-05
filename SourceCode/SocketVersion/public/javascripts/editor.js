/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

$(document).ready(function () {
    //Logic to handle drawing and sending
    var socket = io.connect('http://127.0.0.1:4200');
    var user = JSON.parse(sessionStorage.getItem('user'));
    var alltypes = null;

    socket.on('messages', function (data) {
        var messages = JSON.parse(data);
        console.log(messages);
        //TODO disply messages on browser
    });

    socket.on('no-messages', function () {
        console.log('No messages stored');
        //TODO display info on browser
    });

    socket.on('type', function (data) {
        $('.result').css('display', 'inherit');
        data = JSON.parse(data);
        addElementWithType(data);
    });

    socket.on('alltypes', function (data) {
        alltypes = JSON.parse(data);
        //Is called when alltypes form the rest are received
        console.log(data);
    });

    socket.emit('getalltypes');

    function getPicData() {
        //get the pixel of the canvas
        var canvas = $('#can')[0];
        var ctx = canvas.getContext("2d");
        var pix = ctx.getImageData(0, 0, 400, 400);
        //Compress data
        var content = binaryCompression(pix);
        //Resizing the data
        content = resizeData(content);
        //Length Encoding
        var compcontent = lenEncode(content);
        //calls socket.on(type,...) when probability is returned
        socket.emit('gettype', user.username, compcontent);
    }

    binaryCompression = function (pix) {
        var temp = 0;
        var content = '';
        //Compress rgb to 0 or 1
        for (let i = 0; i < pix.data.length; i += 4) {
            temp = pix.data[i] + pix.data[i + 1] + pix.data[i + 2] + pix.data[i + 3];
            if (temp == 0)
                content = content + "0";
            else
                content = content + "1";
        }
        return content;
    }

    resizeData = function (content) {
        var pix = 0;
        var newcontent = '';
        var height = 400;
        var width = 400;
        var xdiv = Math.round(height / 100);
        var ydiv = Math.round(width / 100);
        for (let y = Math.floor(ydiv / 2); y <= width - Math.floor(ydiv / 2); y += ydiv) {
            for (let x = Math.floor(xdiv / 2); x <= height - Math.floor(xdiv / 2); x += xdiv) {
                for (let i = Math.floor(ydiv / 2) * -1; i < Math.floor(ydiv / 2) - 1; i++) {
                    for (let u = Math.floor(xdiv / 2) * -1; u < Math.floor(xdiv / 2) - 1; u++) {
                        pix += parseInt(content[(y + i) * height + (x + u)]);
                    }
                }
                if (pix > 0)
                    newcontent += "1";
                else
                    newcontent += "0";
                pix = 0;
            }
        }
        return newcontent;
    }

    lenEncode = function (content) {
        var count = 0;
        var compcontent = '';
        var lastpix = 'B';
        var actpix = '';
        for (var u = 0; u < content.length; u++) {
            switch (content[u]) {
                case '0':
                    actpix = 'B';
                    break;
                case '1':
                    actpix = 'W';
                    break;
            }
            if (lastpix == actpix) {
                count++;
            } else {
                compcontent += count + lastpix;
                lastpix = actpix;
                count = 1;
            }
            if (u == content.length - 1) {
                compcontent += count + actpix;
            }
        }
        return compcontent;
    }



    //further usage of data: representation and synchronisation of data, dragEditor
    function element(id, type) {
        var self = this;
        self.internalID = ko.observable(id)
        self.id = ko.observable(isNaN(id) ? id : 'Element' + id);
        self.parent = ko.observable();
        self.childNodes = ko.observableArray([]);
        self.x = ko.observable(0);
        self.y = ko.observable(0);
        self.w = ko.observable(100);
        self.h = ko.observable(100);
        self.styleString = ko.observable('');
        self.innerTextString = ko.observable('');
        self.type = ko.observable(type);
    }

    //view model for Editor.html
    function EditorViewModel() {
        this.self = this;
        self.elementArray = ko.observableArray();
        self.counter = ko.observable(0);
        //a placeholder used as chosenObject when no element is chosen.
        self.rangePlaceholder = new element("range");
        self.rangePlaceholder.h(null);
        self.rangePlaceholder.w(null);
        self.rangePlaceholder.y(null);
        self.rangePlaceholder.x(null);
        //the element which attributes are currently displayed in 
        //Editor.html's input elements and modified contextmenu
        self.chosenObject = ko.observable(self.rangePlaceholder);

        //recoursively disabling dragability of parents when child is dragged
        //until the last element is reached.
        function untilRange(element, flag) {
            var flag = flag;
            var element = element;
            if (element == document) {
                return;
            }
            if (element.parentNode.parentNode == $(document.body)) {
                parent = element.parentNode;
            } else {
                var parent = element.parentNode.parentNode;
            }
            if (typeof Draggable.get(parent) !== 'undefined') {
                if (flag) {
                    Draggable.get(parent).enable();
                } else {
                    Draggable.get(parent).disable();
                }
            }
            if (parent == $(document)) {
                return;
            }
            untilRange(parent, flag);
        }

        //main binding. handles dragging, resizing, enforcing constraints (e.g.: child has to be smaller than parent)
        ko.bindingHandlers.dragResize = {
            init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                var val = ko.unwrap(valueAccessor());

                checkParent(element, val);
                //making element a draggable
                createDragElement(element, val);
                //making the handle draggable
                createHandle(element, val);
            },
            update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                var updateCoords = function () {
                    //constraints on x,y,h,w of child.
                    checkConstraints(val);
                    //setting values after constraint checked
                    TweenLite.set(element, { x: val.x(), y: val.y(), width: val.w(), height: val.h() });
                    //aligning handle after constraints enforced
                    TweenLite.set($(element).children(".resize-handle"), { top: val.h(), left: val.w() });
                    //updating JSON in the sidebar's textarea
                    updateJSON();
                    //putting JSON into localStorage for the Viewer.js
                    localStorage.setItem('data', JSONField.value);
                };
                var val = ko.unwrap(valueAccessor());
                // make the updateCoors function call whenever one of its observables
                // changes
                updateCoords();
            }
        };

        //displays the modified contextmenu.
        rightClicked = function (data, e) {
            if (e.which === 3) {
                $('#contextmenuReplacer')[0].style['left'] = e.pageX + "px";
                $('#contextmenuReplacer')[0].style['top'] = e.pageY + "px";
                $('#contextmenuReplacer')[0].style['display'] = 'block';

            }
        }

        rangeClick = function (data, e) {
            setRange();
            TweenLite.set($("#canDiv")[0], { autoAlpha: 1 });
        };

        //sets the chosenObject to rangePlaceholder, causing all controls to disable.
        setRange = function () {
            TweenLite.to($("#" + self.chosenObject().internalID()), 0.5, { boxShadow: "none" });
            self.chosenObject(self.rangePlaceholder);
        };

        //displaying canvas on double click for drawing a new element
        objDblClick = function (data, e) {
            self.chosenObject(data);
            e.stopPropagation();
            TweenLite.set($("#canDiv")[0], { autoAlpha: 1, x: data.x(), y: data.y() });
        };

        getType = function () {
            getPicData();
        };

        //adding a new element of given type to either elementArray or the childNodes observableArray of
        //the chosenObject.
        addElementWithType = function (type) {
            self.counter(self.counter() + 1);
            if (self.chosenObject().internalID() == "range") {
                self.elementArray.push(new element(self.counter(), type));
            } else {
                self.chosenObject().childNodes.push(new element(self.counter(), type));
            }
            TweenLite.set($("#canDiv")[0], { autoAlpha: 0 });
            $("#can")[0].getContext('2d').clearRect(0, 0, 400, 400);
        };

        //deleting an element
        delElement = function () {
            if (self.chosenObject().parent()[0] == $("range")[0]) {
                var x = ko.dataFor(self.chosenObject().parent());
                var saveCO = x.childNodes()[x.childNodes.indexOf(self.chosenObject())];
                self.chosenObject(x);
                x.childNodes.remove(saveCO);
            } else {
                var saveCO = self.elementArray()[self.elementArray.indexOf(self.chosenObject())];
                updateCO(self.rangePlaceholder);
                self.elementArray.remove(saveCO);
            }
        };

        //listening for a keypdown of the 'del' key 
        $(document).on("keydown", function (e) {
            if (e.which == 46 && self.chosenObject().internalID() != "range") {
                delElement();
            }
        });

        //hiding the canvas div
        closeCan = function () {
            TweenLite.set($("#canDiv")[0], { autoAlpha: 0 });
        };

        //updating the chosenObject and setting styles
        updateCO = function (newVal, e) {
            if (typeof e != "undefined") {
                e.stopPropagation();
            }
            idString = self.chosenObject().internalID();
            var currClass = "." + idString
            TweenLite.to($("#" + idString), 0.5, { boxShadow: "none" });
            TweenLite.set(currClass, { border: "none", background: "none", color: "black" });
            self.chosenObject(newVal);
            idString = self.chosenObject().internalID();
            currClass = "." + idString;
            TweenLite.set(currClass, { border: "1px solid blue", background: "rgb(35, 173, 255)", color: "white" });
            if (idString != "range") {
                TweenLite.to($("#" + idString), 0.5, { boxShadow: "rgb(35, 173, 255) 1px 0px 21px 0px" });
            }
        };

        //redirecting to training.html
        toTrainer = function () {
            window.location.href = "/training.html";
        };

        //recursively translating all ko.observables to Plain Old Javacsript Objects
        function decycle(array) {
            var dearray = [];
            for (var i = 0; i < array.length; i++) {
                dearray[i] = {
                    tId: array[i].type().type_id, tLbl: array[i].type().label, id: array[i].id(),internalID:array[i].internalID(),height: array[i].h(), width: array[i].w(), posX: array[i].x(), posY: array[i].y(), type: array[i].type().type_id, innerTextString: array[i].innerTextString(), styleString: array[i].styleString(), childs: decycle(array[i].childNodes())
                };
            }
            return dearray;
        }

        //updating the sidebar's textarea
        updateJSON = function () {
            $("#JSONField").val(JSON.stringify(decycle(self.elementArray()), null, 1));
        };

        //loading elements from JSON in the sidebar's textarea
        loadFromJson = function () {
            var jsonText = $("#JSONField").val();
            self.elementArray.removeAll();
            self.counter(0);
            JSONToKo(JSON.parse(jsonText), self.elementArray);
        };

        //translating POJOs to ko.observables
        JSONToKo = function (Jarr, Karr, parentElement) {
            for (var i = 0; i < Jarr.length; i++) {
                self.counter(self.counter() + 1);
                var tempObj = new element(Jarr[i].internalID, Jarr[i].type);
                tempObj.internalID(counter());
                tempObj.h(Jarr[i].height);
                tempObj.w(Jarr[i].width);
                tempObj.x(Jarr[i].posX);
                tempObj.y(Jarr[i].posY);
                tempObj.styleString(Jarr[i].styleString);
                tempObj.innerTextString(Jarr[i].innerTextString);
                if (Jarr[i].childs.length > 0) {
                    tempObj.childNodes = JSONToKo(Jarr[i].childs, ko.observableArray());
                }
                tempObj.type({ type_id: Jarr[i].tId, label: Jarr[i].tLbl });
                console.log(tempObj.id());
                Karr.push(tempObj);
            }
            return Karr;
        };

        //recursivley building DOM Elements from a Javasctipt array
        buildHTMLTag = function (POJOArray) {
            const HTML = `
                ${POJOArray.map(Pojobject => `<${findTag("HTML", Pojobject.tId)} id="${Pojobject.id}" 
                                            style="width:${Pojobject.width}px;height:${Pojobject.height}px;left:${Pojobject.posX}px;top:${Pojobject.posY}px;position:absolute;${Pojobject.styleString}">
                                                ${Pojobject.innerTextString}${Pojobject.childs.length > 0 ? buildHTMLTag(Pojobject.childs) : ""}
                                            </${findTag("HTML", Pojobject.tId)} > `).join('')}
            `;
            return HTML;
        };

        findTag = function (formatTag, id) {
            console.log(id);
            if (formatTag == 'HTML') {
                return alltypes[id].html_tag;
            }
        };

        //setting the val object's parent element and managing initial size of the element, setting z-indices to ensure
        //no parent covering their child elements
        function checkParent(element,val) {
            if (element.parentNode.parentNode == $("body")[0]) {
                val.parent($("#range"));
            } else {
                val.parent(element.parentNode.parentNode);

                if (typeof $(val.parent()).css("zIndex") == "undefined" || isNaN($(val.parent()).css("zIndex"))) {
                    TweenLite.set($(val.parent()), { css: { zIndex: 1 } });
                    TweenLite.set(element, { css: { zIndex: parseInt($(val.parent()).css("zIndex")) + 1 } });
                } else {
                    TweenLite.set(element, { css: { zIndex: parseInt($(val.parent()).css("zIndex")) + 1 } });
                    val.w(Math.floor(ko.dataFor(val.parent()).w() * 0.7));
                    val.h(Math.floor(ko.dataFor(val.parent()).h() * 0.7));
                }
            }
        }

        function createDragElement(element, val) {
            var drag = Draggable.create(element, {
                type: "x,y", bounds: val.parent(),
                onDragStart: function () {
                    updateCO(ko.dataFor(element));
                    if (typeof Draggable.get(val.parent()) !== "undefined") {
                        //disabling dragging for all draggable parents
                        untilRange(element, false);
                    }

                },
                onDragEnd: function () {
                    if (typeof Draggable.get(val.parent()) !== "undefined") {
                        //enabling dragging for all draggable parents
                        untilRange(element, true);
                    }
                },
                onDrag: function (e) {
                    val.x(Math.round(this.x));
                    val.y(Math.round(this.y));
                }
            });
        }

        function createHandle(element, val) {
            //creating and positioning DOM element for the resize handle
            var handle = $("<div class='resize-handle' style='bottom:0;right:0;'></div>").appendTo(element);
            TweenLite.set(handle, { top: val.h(), left: val.w() });
            drag = Draggable.create(handle, {
                type: "top,left", bounds: val.parent(),
                onPress: function (e) {
                    e.stopPropagation(); // preventing event bubbling
                },
                onDrag: function (e) {
                    val.w(Math.round(this.x));
                    val.h(Math.round(this.y));
                    TweenLite.set(element, { width: val.w(), height: val.h() });
                }
            });
        }

        function checkConstraints(val) {
            if (parseInt(val.x()) + parseInt(val.w()) >= $(val.parent()).width()) {
                val.x($(val.parent()).width() - val.w() - 1);
            }
            if (val.x() < 0) {
                val.x(0);
                if (parseInt(val.x()) + parseInt(val.w()) >= $(val.parent()).width()) {
                    val.w($(val.parent()).width());
                }
            }
            if (parseInt(val.y()) + parseInt(val.h()) >= $(val.parent()).height()) {
                val.y($(val.parent()).height() - val.h() - 1);
            }
            if (val.y() < 0) {
                val.y(0);
                if (parseInt(val.y()) + parseInt(val.h()) >= $(val.parent()).height()) {
                    val.h($(val.parent()).height());
                }
            }
            if (val.w() < 20) {
                val.w(20);
            }
            if (val.h() < 20) {
                val.h(20);
            }
        }

        //function to download generated html and JSON
        doDownload = function () {
            var HTMLAnchor = document.createElement('a');
            var HTMLPage = '<!DOCTYPE html> <html> <head> <title>TODO</title> <meta charset="UTF-8"> <style>body * {margin: 0;padding: 0;}</style > </head> <body> ' + buildHTMLTag(JSON.parse(JSONField.value)) +' </body> </html> ';
            HTMLAnchor.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(HTMLPage.replace(/(\r\n\t|\n|\r\t)/gm, "");));
            HTMLAnchor.setAttribute('download', 'download.html');
            //HTMLAnchor.style.visibility = 'hidden';
            //document.body.appendChild(HTMLAnchor);
            HTMLAnchor.click();

            setTimeout(function () {
                //document.body.removeChild(HTMLAnchor);
                jsonAnchor = document.createElement('a');
                jsonAnchor.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(JSONField.value.replace(/(\r\n\t|\n|\r\t)/gm, "");));
                jsonAnchor.setAttribute('download', 'save.json');
                //jsonAnchor.style.visibility = 'hidden';
                //document.body.appendChild(jsonAnchor);
                jsonAnchor.click();
                //document.body.removeChild(jsonAnchor);
            },2000);
        }

        //strippling styleString from non-printable characters
        getStyles = function (styleString) {
            styleString = styleTArea.value.replace(/(\r\n\t|\n|\r\t)/gm, "");
            console.log(styleString)
            return styleString;
        }


        //hiding contextmenuReplacer 
        hideContext = function (data,e) {
            if (e.target.parentElement != $('#contextmenuReplacer')[0]){
                $('#contextmenuReplacer')[0].style['display'] = 'none';
            }
        }
    }
    ko.applyBindings(new EditorViewModel);
});