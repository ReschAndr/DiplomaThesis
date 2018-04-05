$(document).ready(function () {
    //var picclick = false;
    var canvas, ctx, flag = false,
        prevX = 0,
        currX = 0,
        prevY = 0,
        currY = 0,
        dot_flag = false;
    var minX = 0,
        maxX = 0,
        minY = 0,
        maxY = 0;
    var canvasBounds;
    var x = "black",
        y = 1;
    init();

    function init() {
        canvas = $("#can");
        console.log("init.")
        ctx = canvas[0].getContext("2d"),
            width = $("#range").width(),
            height = $("#range").height(),

            canvas.attr("width", width);
        canvas.attr("height", height);
        var down = false;

        w = canvas.width;
        h = canvas.height;
        canvasBounds = canvas[0].getBoundingClientRect();
        console.log(canvasBounds);
        canvas[0].addEventListener("mousemove", function (e) {
            findxy('move', e);
        }, false);
        canvas[0].addEventListener("mousedown", function (e) {
            canvasBounds = canvas[0].getBoundingClientRect();
            console.log(canvasBounds);
            findxy('down', e);
        }, false);
        canvas[0].addEventListener("mouseup", function (e) {
            findxy('up', e);
        }, false);
        canvas[0].addEventListener("mouseout", function (e) {
            findxy('out', e);
        }, false);
    }

    //MAIN PART
    function simulateMove(e) {
        var evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("mousemove", true, true, window,
            0, e.screenX, e.screenY, e.clientX, e.clientY, false, false, false, false, 0, null);
        canvas[0].dispatchEvent(evt);
    }
    function simulateDown(e) {
        //if (!picclick) {
        var evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("mousedown", true, true, window,
            0, e.screenX, e.screenY, e.clientX, e.clientY, false, false, false, false, 0, null);
        canvas[0].dispatchEvent(evt);
        //}
        //console.log("Emulated.");
    }
    function simulateUp(e) {
        var evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("mouseup", true, true, window,
            0, e.screenX, e.screenY, e.clientX, e.clientY, false, false, false, false, 0, null);
        canvas[0].dispatchEvent(evt);
        //console.log("Emulated.");
    }
    function simulateOut(e) {
        var evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("mouseout", true, true, window,
            0, e.screenX, e.screenY, e.clientX, e.clientY, false, false, false, false, 0, null);
        canvas[0].dispatchEvent(evt);
        //console.log("Emulated.");
    }
    $("body > div").each(function () {
        this.addEventListener("mousemove", simulateMove);
        this.addEventListener("mousedown", simulateDown);
        this.addEventListener("mouseup", simulateUp);
        this.addEventListener("mouseout", simulateOut);
    });

    function draw() {
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(currX, currY);
        ctx.strokeStyle = x;
        ctx.lineWidth = y;
        ctx.stroke();
        ctx.closePath();
    }


    function findxy(res, e) {
        if (res == 'down') {
            
            prevX = currX;
            prevY = currY;
            currX = e.pageX - canvasBounds.left;
            currY = e.clientY - canvasBounds.top;
            //currX /= canvasBounds.width;
            //currY /= canvasBounds.height;
            //currX *= canvas.width;
            //currY *= canvas.height;
            flag = true;
            minX = currX;
            maxX = currX;
            maxY = currY;
            minY = currY;
            dot_flag = true;
            if (dot_flag) {
                ctx.beginPath();
                ctx.fillStyle = x;
                ctx.fillRect(currX, currY, 2, 2);
                ctx.closePath();
                dot_flag = false;
            }
        }
        if (res == 'up') {
            flag = false;
            console.log("(" + minX + "," + minY + "),(" + maxX + "," + minY + ")")
            ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
            //ctx.clearRect(0, 0, w, h);
            //erase();
        }
        if (res == 'move') {
            if (flag) {
                prevX = currX;
                prevY = currY;
                currX = e.pageX - canvasBounds.left;
                currY = e.clientY - canvasBounds.top;
                //currX = e.pageX - canvasBounds.left - scrollX;
                //currY = e.clientY - canvasBounds.top - scrollY;
                //currX /= canvasBounds.width;
                //currY /= canvasBounds.height;
                //currX *= canvas.width;
                //currY *= canvas.height;
                if (maxX < currX) {
                    maxX = currX;
                } else if (minX > currX) {
                    minX = currX;
                }

                if (maxY < currY) {
                    maxY = currY;
                } else if (minY > currY) {
                    minY = currY;
                }
                draw();
            }
        }
    }
});