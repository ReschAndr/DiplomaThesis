$(document).ready(function () {
    window.onstorage = function () {
        console.log(localStorage.getItem('data'));
        var HTML=buildHTMLTag(JSON.parse(localStorage.getItem('data')));
        $('body')[0].innerHTML = HTML
    }
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
        switch (id) {
            case 0:
                if (formatTag == "HTML") {
                    return "button";
                } else {
                    console.log("not supported yet");
                }
                break;
            case 1:
                if (formatTag == "HTML") {
                    return "p";
                } else {
                    console.log("not supported yet");
                }
                break;
            case 2:
                if (formatTag == "HTML") {
                    return "div";
                } else {
                    console.log("not supported yet");
                }
                break;
            case 3:
                if (formatTag == "HTML") {
                    return "input";
                } else {
                    console.log("not supported yet");
                }
                break;
            case 7:
                if (formatTag == "HTML") {
                    return "img";
                } else {
                    console.log("not supported yet");
                }
                break;
            case 8:
                if (formatTag == "HTML") {
                    return "select";
                } else {
                    console.log("not supported yet");
                }
                break;
            case 9:
                if (formatTag == "HTML") {
                    return "h1";
                } else {
                    console.log("not supported yet");
                }
                break;
            case 10:
                if (formatTag == "HTML") {
                    return "a";
                } else {
                    console.log("not supported yet");
                }
                break;
            case 11:
                if (formatTag == "HTML") {
                    return "table";
                } else {
                    console.log("not supported yet");
                }
                break;
            case 12:
                if (formatTag == "HTML") {
                    return "ul";
                } else {
                    console.log("not supported yet");
                }
                break;
            default:
                console.log("not supported yet");
                return 'div"';
                break;
        }
    };
    getStyles = function (styleString) {
        styleString = styleTArea.value.replace(/(\r\n\t|\n|\r\t)/gm, "");
        console.log(styleString)
        //styleArray = styleString.split(';');
        //console.log(styleArray.length);
        //for (var i = 0; i < styleArray.length; i++) {
        //    console.log(i)
        //    styleObject = styleArray[i].split(':');
        //    console.log(styleObject);
        //    target.style[styleObject[0]] = styleObject[1];
        //}
        return styleString;
    };

});