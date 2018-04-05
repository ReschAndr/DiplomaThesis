$(document).ready(function () {
    var canvas, ctx, flag = false,
            prevX = 0,
            currX = 0,
            prevY = 0,
            currY = 0,
            dot_flag = false;
    var canvasBounds;
    var x = "black",
            y = 1;
    init();
    function init() {
        canvas = document.getElementById('can');
        ctx = canvas.getContext("2d");
        w = canvas.width;
        h = canvas.height;
        canvasBounds = canvas.getBoundingClientRect();
        canvas.addEventListener("mousemove", function (e) {
            findxy('move', e);
        }, false);
        canvas.addEventListener("mousedown", function (e) {
            canvasBounds = canvas.getBoundingClientRect();
            findxy('down', e);
        }, false);
        canvas.addEventListener("mouseup", function (e) {
            findxy('up', e);
        }, false);
        canvas.addEventListener("mouseout", function (e) {
            findxy('out', e);
        }, false);
    }
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
            currX = e.pageX - canvasBounds.left - scrollX;
            currY = e.clientY - canvasBounds.top - scrollY;
            currX /= canvasBounds.width;
            currY /= canvasBounds.height;
            currX *= canvas.width;
            currY *= canvas.height;
            flag = true;
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
            //ctx.clearRect(0, 0, w, h);
            //erase();
        }
        if (res == 'move') {
            if (flag) {
                prevX = currX;
                prevY = currY;
                currX = e.pageX - canvasBounds.left - scrollX;
            currY = e.clientY - canvasBounds.top - scrollY;
            currX /= canvasBounds.width;
            currY /= canvasBounds.height;
            currX *= canvas.width;
            currY *= canvas.height;
                draw();
            }
        }
    }
});