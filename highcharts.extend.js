/**
 *  基于SVG的表格数据展示插件封装及生成Highcharts所需数据格式的JSON方法封装
 *  build by rwsong @2015-03-02
 *  mail:rw_Song@sina.com
 */

!function (win, $, u) {

    /**
     * 拓展jQuery下创建SVG的方法
     * @param tagName string
     * @returns SVGElement
     */
    $.svg = function $svg(tagName) {
        var svgns = "http://www.w3.org/2000/svg";
        return $(document.createElementNS(svgns, tagName));
    };

    /**
     * Table 对象的构造方法
     * @param opt  JSON
     * @constructor
     */
    function Table(opt) {
        this.rendObj = $("#" + opt["chart"]["rendTo"]);
        this.title = opt["title"]["text"];
        this.data = opt["data"];
        this.xData = opt["xAxis"]["categories"];
        this.yData = opt["yAxis"]["categories"];
        this.autoFix = opt["chart"]["autoFix"];

        if(opt["width"]){
            this.rendObj.width(opt["width"]);
        }else if(this.rendObj.width() == 0 || $(win).width() && !opt["width"]){
            this.rendObj.width(650);
        }
        //  传了width设置传入的,否则如果样式也没写,设置一个默认的

        if(opt["height"]){
            this.rendObj.height(opt["height"]);
        }else if(this.rendObj.height() == 0 && !opt["height"]){
            this.rendObj.height(450);
        }
        //  同上

        this.kinds = opt["chart"]["kinds"];
        //  种类,左上角的分类
        this.direction = opt["chart"]["direction"];
        this.width = this["rendObj"].width();
        this.height = this["rendObj"].height();
        this.svgId = "svg" + new Date().getTime();
        this.xSize = [];
        this.ySize = [];

        opt["cellSize"] &&
        opt["cellSize"]["x"] &&
        (this.xSize = opt["cellSize"]["x"]) &&
        (this.width = getSum(this.xSize)) &&
        this.rendObj.width(this.width);
        //  如果传入表格列宽,更新width属性和渲染目标的宽度

        if(opt["chart"]["autoFix"]){
            initTableSize(this);
            initContainer(this);
            initSVGFix(this);
        }else{
            initContainer(this);
            initSVG(this);
        }
    }

    /**
     * Table原型下返回SVG标签字符串给后端处理后导出
     * @returns {XML|string|void}
     */
    Table.prototype.getSVG = function () {
        var self = this,
            spaceReg = /\n/g;
        return $(self["rendObj"].find("div.highcharts-table-container")).html().replace(spaceReg, "");
    };

    /**
     * 创建一个容器div,并随着窗口大小自适应的方法
     * @param s object
     * return function
     */
    function initContainer(s) {
        return function (s) {
            s["rendObj"].append("<div class='highcharts-table-container' style='position: relative; overflow: hidden; width: " + s["width"] + "px; height: " + s["height"] + "px; text-align: left; line-height: normal; z-index: 0; -webkit-tap-highlight-color: rgba(0, 0, 0, 0);'></div>");
            $(window).resize(function () {
                s["rendObj"].find("div.highcharts-table-container").css({
                    "width": s["rendObj"].width() + 40,
                    "height": s["rendObj"].height() + 40
                });
            });
        }(s);
    }

    /**
     * 创建svg元素,用于显示,此方法用于自动换行
     * @param s object
     */
    function initSVGFix(s) {
        var container = s["rendObj"].find("div.highcharts-table-container"),
            svg = $.svg("svg"),
            svgId = s["svgId"],
            tmpX = 0;

        svg.attr({
            "width": s["width"] + 40,
            "height": s["height"] + 40,
            "xmlns": "http://www.w3.org/2000/svg",
            "id": svgId
        });
        container.append(svg);
        s.svgNode = $("#" + svgId);
        var rect = $.svg("rect");
        rect.attr({
            "width": s["width"],
            "height": s["height"],
            "fill": "none",
            "stroke": "#000",
            "stroke-opacity": 1,
            "stoke-width":1
        });
        s.svgNode.append(rect);
        //  整个大容器

        var text = $.svg("text");
        text.attr({
            "xml:space": "preserve",
            "width": s["width"],
            "height": 60,
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            "font-family": "SimSun",
            "font-weight": "100",
            "font-size": 25,    //表头
            "fill-opacity": 1,
            "stroke": "#000",
            "x": "50%",
            "y": 20
        }).html(s["title"]);
        s.svgNode.append(text);
        //  表格头、外框和文字

        var lineLens = s["data"].length,
            g = $.svg("g"),
            rows = [],
            cols = [];
        g.attr({
            "class": "table-rows"
        });
        for (var i = 0; i < s["yData"].length + 1; i++) {
            var top = (s["height"] - 40) / (s["yData"].length + 1) * (i) + 30,
                bottom = top + (s["height"] - 40) / (s["yData"].length + 1);
            if(i == 0){
                top = 40;
                bottom = 100;
            }
            if(i >= 2 && s["ySize"].length > 0 && s["ySize"][i - 1]){
                top = rows[i - 1]["bottom"];
                bottom = top + s["ySize"][i - 1];
            }
            //  从数据展示区域开始,开始刚才算出来表格的行高,并且更新top和bottom

            var path = $.svg("path");
            path.attr({
                "fill": "none",
                "stroke": "#000",
                "stroke-width": 1,
                "stroke-opacity": 1,
                "stoke-width":1,
                "d": "M 0 " + top + " L " + s["width"] + " " + top
            });
            rows.push({
                "top": top,
                "bottom": bottom + 6
            });
            g.append(path);
        }
        s.svgNode.append(g);
        //  绘制表格行

        g = $.svg("g");
        g.attr({
            "class": "table-cols"
        });
        for (var i = 0; i <= s["xData"].length + 1; i++) {
            var left = (s["width"] / (s["xData"].length + 1)) * i,
                right = left + (s["width"] / (s["xData"].length + 1));
            //  没有传列宽,平分列宽

            if(s["xSize"][i] && i >= 1){
                tmpX += s["xSize"][i - 1];
                left = tmpX;
                right = left;
            }
            //  指定了表格列宽,更新left和right

            path = $.svg("path");
            path.attr({
                "index":i,
                "fill": "none",
                "stroke": "#000",
                "stroke-width": 1,
                "stroke-opacity": 1,
                "d": "M " + left + " " + 40 + " L " + left + " " + s["height"]
            });
            g.append(path);


            if(s["xSize"].length > 0 && s["xSize"][i] && i >= 1){
                cols.push({
                    "left": left*2 || 0,
                    "right": s["xSize"][i]
                });
            }else if(s["xSize"].length == 0){
                cols.push({
                    "left": left,
                    "right": right
                });
            }
            //  分指定的列宽存储和平均存储列宽

        }
        s.svgNode.append(g);
        //  绘制表格列

        g = $.svg("g");
        g.attr({
            "class": "xAxis"
        });
        for (var i = 1; i <= s["xData"].length; i++) {
            var x = 0,
                y = 0;

            if(s["xSize"].length > 0){
                x = (parseInt(cols[i - 1]["left"]) + parseInt(cols[i - 1]["right"])) / 2;
                y = (parseInt(rows[0]["top"]) + parseInt(rows[0]["bottom"])) / 2;
            }else{
                x = (parseInt(cols[i]["left"]) + parseInt(cols[i]["right"])) / 2;
                y = (parseInt(rows[0]["top"]) + parseInt(rows[0]["bottom"])) / 2;
            }
            //  取指定的列宽存储和平均存储列宽

            text = $.svg("text");
            text.attr({
                "xml:space": "preserve",
                "width": "100%",
                "height": 40,
                "text-anchor": "middle",
                "dominant-baseline": "middle",
                "font-family": "SimSun",
                "font-weight": "100",
                "font-size": 20,     //categories
                "fill-opacity": 1,
                "stroke": "#000",
                "x": x,
                "y": y
            }).html(s["xData"][i - 1]);
            g.append(text);
        }
        s.svgNode.append(g);
        //  绘制横向列名称

        g = $.svg("g");
        g.attr({
            "class": "yAxis"
        });
        for (var i = 1; i <= s["yData"].length; i++) {
            var x = (parseInt(cols[0]["left"]) + parseInt(cols[0]["right"])) / 2,
                y = (parseInt(rows[i]["top"]) + parseInt(rows[i]["bottom"])) / 2;

            text = $.svg("text");
            text.attr({
                "xml:space": "preserve",
                "width": s["width"],
                "height": 40,
                "text-anchor": "middle",
                "dominant-baseline": "middle",
                "font-family": "SimSun",
                "font-weight": "100",
                "font-size": 20,   //第一列
                "fill-opacity": 1,
                "stroke": "#000",
                "x": x,
                "y": y
            }).html(s["yData"][i - 1]);
            g.append(text);
        }
        s.svgNode.append(g);
        //  绘制纵向行名称

        g = $.svg("g");
        g.attr({
            "class": "data-area"
        });
        for (var i = 0; i < s["data"].length; i++) {
            var left = (parseInt(cols[i + 1]["left"]) + parseInt(cols[i + 1]["right"])) / 2;
            (function (d, x) {
                for (var j = 0; j < d.length; j++) {
                    var y = (parseInt(rows[j + 1]["top"]) + parseInt(rows[j + 1]["bottom"])) / 2,
                        type = getType(d[j]);
                    if(type == "string"){
                        text = $.svg("text");
                        text.attr({
                            "xml:space": "preserve",
                            "display" : "inline-block",
                            "width": s["width"],
                            "height": 40,
                            "text-anchor": "middle",
                            "dominant-baseline": "middle",
                            "font-family": "SimSun",
                            "font-weight": "100",
                            "font-size": 20,        //内容
                            "fill-opacity": 1,
                            "stroke": "#000",
                            "x": x,
                            "y": y
                        }).html(d[j]);
                        g.append(text);
                    }else if(type == "array"){
                        var len = d[j].length,
                            top = parseInt(rows[j + 1]["top"]),
                            bottom = parseInt(rows[j + 1]["bottom"]),
                            cellH = bottom - top,
                            cellW = s["xSize"][i + 2],
                            eachH = cellH / len,
                            yPos = 0,
                            textCollection = $.svg("g");


                        textCollection.attr({
                            "class":"collection-" + j
                        });
                        $.each(d[j],function(k,ele){
                            text = $.svg("text");
                            text.attr({
                                "xml:space": "preserve",
                                "display" : "inline-block",
                                "width": s["width"],
                                "height": 40,
                                "text-anchor": "middle",
                                "dominant-baseline": "middle",
                                "font-family": "SimSun",
                                "font-weight": "100",
                                "font-size": 20,        //内容
                                "fill-opacity": 1,
                                "stroke": "#000",
                                "x": x,
                                "y": top + eachH / 2 + eachH * k    //  根据当前第几行动态计算y属性值
                            }).html(d[j][k]);
                            textCollection.append(text);
                        });
                        //  把所有的文字再用一个g标签组合起来
                        g.append(textCollection);
                    }
                }
            })(s["data"][i]["data"], left);
        }
        s.svgNode.append(g);
        //  表格的数据展示区域
    }

    /**
     * 创建svg元素,用于显示,此方法用于不自动换行
     * @param s
     */
    function initSVG(s) {
        var container = s["rendObj"].find("div.highcharts-table-container"),
            svg = $.svg("svg"),
            svgId = s["svgId"],
            tmpX = 0;

        svg.attr({
            "width": s["width"] + 40,
            "height": s["height"] + 40,
            "xmlns": "http://www.w3.org/2000/svg",
            "id": svgId
        });
        container.append(svg);
        s.svgNode = $("#" + svgId);
        var rect = $.svg("rect");
        rect.attr({
            "width": s["width"],
            "height": s["height"],
            "fill": "none",
            "stroke": "#000",
            "stroke-opacity": 1
        });
        s.svgNode.append(rect);
        //  整个大容器

        var text = $.svg("text");
        text.attr({
            "xml:space": "preserve",
            "width": s["width"],
            "height": 60,
            "text-anchor": "middle",
            "dominant-baseline": "middle",
            "font-family": "SimSun",
            "font-weight": "100",
            "font-size": 25,    //表头
            "fill-opacity": 1,
            "stroke": "#000",
            "x": "50%",
            "y": 20
        }).html(s["title"]);
        s.svgNode.append(text);
        //  表格头

        var path = $.svg("path");
        path.attr({
            "fill": "none",
            "stroke": "#000",
            "stroke-width": 1,
            "stroke-opacity": 1,
            "d": "M 0 40 L " + s.width + " 40"
        });
        s.svgNode.append(path);
        //  绘制表格外框、分割线和文字

        var lineLens = s["data"].length,
            g = $.svg("g"),
            rows = [],
            cols = [];
        g.attr({
            "class": "table-rows"
        });
        for (var i = 0; i < s["yData"].length + 1; i++) {
            var top = (s["height"] - 40) / (s["yData"].length + 1) * (i) + 40,
                bottom = top + (s["height"] - 40) / (s["yData"].length + 1);
            path = $.svg("path");
            path.attr({
                "fill": "none",
                "stroke": "#000",
                "stroke-width": 1,
                "stroke-opacity": 1,
                "d": "M 0 " + top + " L " + s["width"] + " " + top
            });
            rows.push({
                "top": top,
                "bottom": bottom + 6
            });
            g.append(path);
        }
        s.svgNode.append(g);
        //  绘制表格行

        g = $.svg("g");
        g.attr({
            "class": "table-cols"
        });
        for (var i = 0; i <= s["xData"].length + 1; i++) {
            var left = (s["width"] / (s["xData"].length + 1)) * i,
                right = left + (s["width"] / (s["xData"].length + 1));
            //  没有传列宽,平分列宽

            if(s["xSize"][i] && i >= 1){
                tmpX += s["xSize"][i - 1];
                left = tmpX;
                right = left;
            }
            //  指定了表格列宽,更新left和right

            path = $.svg("path");
            path.attr({
                "index":i,
                "fill": "none",
                "stroke": "#000",
                "stroke-width": 1,
                "stroke-opacity": 1,
                "d": "M " + left + " " + 40 + " L " + left + " " + s["height"]
            });
            g.append(path);


            if(s["xSize"].length > 0 && s["xSize"][i] && i >= 1){
                cols.push({
                    "left": left*2 || 0,
                    //"left": (s["xSize"][i - 1]) || 0,
                    "right": s["xSize"][i]
                });
            }else if(s["xSize"].length == 0){
                cols.push({
                    "left": left,
                    "right": right
                });
            }
            //  分指定的列宽存储和平均存储列宽

        }
        s.svgNode.append(g);
        //  绘制表格列

        g = $.svg("g");
        g.attr({
            "class": "xAxis"
        });

        if(s["kinds"]){
            //  如果左上角指定了类型

            g = $.svg("g");
            g.attr({
                "class": "left-top"
            });
            var top = 40,
                left = 0,
                right = cols[0]["right"],
                bottom = rows[0]["bottom"];

            for(var i  = 0,len = s["kinds"].length;i < len;i ++){
                var line = $.svg("line");
                line.attr({
                    "x1":0,
                    "y1":0,
                    "x2":right,
                    "y2":bottom,
                    "stoke":"#000"
                });

                g.append(line);

            }

            s.svgNode.append(g);

        }







        for (var i = 1; i <= s["xData"].length; i++) {
            var x = 0,
                y = 0;

            if(s["xSize"].length > 0){
                x = (parseInt(cols[i - 1]["left"]) + parseInt(cols[i - 1]["right"])) / 2;
                y = (parseInt(rows[0]["top"]) + parseInt(rows[0]["bottom"])) / 2;
            }else{
                x = (parseInt(cols[i]["left"]) + parseInt(cols[i]["right"])) / 2;
                y = (parseInt(rows[0]["top"]) + parseInt(rows[0]["bottom"])) / 2;
            }
            //  取指定的列宽存储和平均存储列宽

            text = $.svg("text");
            text.attr({
                "xml:space": "preserve",
                "width": "100%",
                "height": 40,
                "text-anchor": "middle",
                "dominant-baseline": "middle",
                "font-family": "SimSun",
                "font-weight": "100",
                "font-size": 20,     //categories
                "fill-opacity": 1,
                "stroke": "#000",
                "x": x,
                "y": y
            }).html(s["xData"][i - 1]);
            g.append(text);
        }
        s.svgNode.append(g);
        //  绘制横向列名称

        g = $.svg("g");
        g.attr({
            "class": "yAxis"
        });
        for (var i = 1; i <= s["yData"].length; i++) {
            var x = (parseInt(cols[0]["left"]) + parseInt(cols[0]["right"])) / 2,
                y = (parseInt(rows[i]["top"]) + parseInt(rows[i]["bottom"])) / 2;

            text = $.svg("text");
            text.attr({
                "xml:space": "preserve",
                "width": s["width"],
                "height": 40,
                "text-anchor": "middle",
                "dominant-baseline": "middle",
                "font-family": "SimSun",
                "font-weight": "100",
                "font-size": 20,   //第一列
                "fill-opacity": 1,
                "stroke": "#000",
                "x": x,
                "y": y
            }).html(s["yData"][i - 1]);
            g.append(text);
        }
        s.svgNode.append(g);
        //  绘制纵向行名称

        g = $.svg("g");
        g.attr({
            "class": "data-area"
        });

        for (var i = 0; i < s["data"].length; i++) {
            var left = (parseInt(cols[i + 1]["left"]) + parseInt(cols[i + 1]["right"])) / 2;
            (function (d, x) {
                for (var j = 0; j < d.length; j++) {
                    var y = (parseInt(rows[j + 1]["top"]) + parseInt(rows[j + 1]["bottom"])) / 2;

                    text = $.svg("text");
                    text.attr({
                        "xml:space": "preserve",
                        "display" : "inline-block",
                        "width": s["width"],
                        "height": 40,
                        "text-anchor": "middle",
                        "dominant-baseline": "middle",
                        "font-family": "SimSun",
                        "font-weight": "100",
                        "font-size": 20,        //内容
                        "fill-opacity": 1,
                        "stroke": "#000",
                        "x": x,
                        "y": y
                    }).html(d[j]);
                    g.append(text);
                }
            })(s["data"][i]["data"], left);
        }
        s.svgNode.append(g);

    }

    /**
     * 检测表格的数据结构,修改表格的高度
     * @param table
     */
    function initTableSize(table){
        var data = table["data"],           //  表格的数据
            ySize = table["ySize"],         //  表格的纵向高度
            xSize = table["xSize"],         //  表格的横向高度
            autoFix = table["autoFix"],     //  指定表格是否自适应
            cellW = 0;                      //  当前列表
        if(!autoFix){
            console.log(111);
            table.height = 30 * data.length + 190;
            table.rendObj.height((table.height + 190));
        }else{
            $.each(data,function(superIndex,supItem){
                //  遍历一级数据

                cellW = xSize[superIndex + 2];
                //  取得对应该列宽

                $.each(supItem["data"],function(subIndex,subItem){
                    //  遍历二级数据

                    if(subItem.length * 20 > cellW){
                        var curLen = subItem.length,                //  当前数据字数
                            maxLen = Math.floor((cellW - 60) / 20),        //  当前单元格最多支持多少个数字
                            tmp = [],                               //  临时数组,缓存被切割后的字符串
                            cutTime = Math.ceil(curLen / maxLen);   //  总共需要切割多少次

                        for(var i = 0;i < cutTime;i ++){
                            tmp.push(subItem.substring(i * maxLen,Math.min((i + 1) * maxLen,curLen)));
                        }
                        supItem["data"][subIndex] = tmp;
                        //  再重新回写到数据中

                        ySize[subIndex] = 35 * cutTime;
                        //  切了多少次,乘以30
                    }else{
                        supItem["data"][subIndex] = subItem;
                        if(!ySize[subIndex] || ySize[subItem] < 35){
                            ySize[subIndex] = 35;
                        }
                        //  如果当前单元格没有超出显示内容,就默认正常高
                    }
                });
            });

            table.height = getSum(table["ySize"]) + 190;
            table.rendObj.height((table.height + 190));
        }
    }

    /**
     * 数组求和
     * @param arr
     * @returns {number}
     */
    function getSum(arr){
        var sum = 0;
        if(Array.prototype.forEach){
            arr.forEach(function(i,k,a){
                sum += i;
            });
            //  ES5
        }else{
            for(var i = 0,l = arr.length;i < l;i ++){
                sum += arr[i];
            }
            //  IE6-8
        }
        return sum;
    }

    /**
     * 通过对象原型获取数据类型,比typeof靠谱
     * @param object
     * @returns {string}
     */
    function getType(obj){
        return Object.prototype.toString.call(obj).toLowerCase().replace(/\[|object|\]|\s/g,'');
    }

    win.Table = Table;
    //  暴露给window

}(window, jQuery, undefined);