/*
PerlinFlow.jsx
A script to transform selected objects using Simplex 
Noise logic for organic variations.
VERSION         : FREE (Grayscale Only)
AUTHOR          : Nobu Design                                     
YOUTUBE        : https://www.youtube.com/@nobudesign
*/

(function() {
    // === 1. SIMPLEX NOISE ENGINE ===
    var SimplexNoise = function(r) {
        if (r == undefined) r = Math;
        this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
        this.p = [];
        for (var i=0; i<256; i++) { this.p[i] = Math.floor(r.random()*256); }
        this.perm = [];
        for(var i=0; i<512; i++) { this.perm[i]=this.p[i & 255]; }
    };
    SimplexNoise.prototype.dot = function(g, x, y) { return g[0]*x + g[1]*y; };
    SimplexNoise.prototype.noise = function(xin, yin) {
        var n0, n1, n2;
        var F2 = 0.5*(Math.sqrt(3.0)-1.0);
        var s = (xin+yin)*F2;
        var i = Math.floor(xin+s);
        var j = Math.floor(yin+s);
        var G2 = (3.0-Math.sqrt(3.0))/6.0;
        var t = (i+j)*G2;
        var X0 = i-t; var Y0 = j-t;
        var x0 = xin-X0; var y0 = yin-Y0;
        var i1, j1;
        if(x0>y0) {i1=1; j1=0;} else {i1=0; j1=1;}
        var x1 = x0 - i1 + G2; var y1 = y0 - j1 + G2;
        var x2 = x0 - 1.0 + 2.0 * G2; var y2 = y0 - 1.0 + 2.0 * G2;
        var ii = i & 255; var jj = j & 255;
        var gi0 = this.perm[ii+this.perm[jj]] % 12;
        var gi1 = this.perm[ii+i1+this.perm[jj+j1]] % 12;
        var gi2 = this.perm[ii+1+this.perm[jj+1]] % 12;
        var t0 = 0.5 - x0*x0-y0*y0;
        if(t0<0) n0 = 0.0; else { t0 *= t0; n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0); }
        var t1 = 0.5 - x1*x1-y1*y1;
        if(t1<0) n1 = 0.0; else { t1 *= t1; n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1); }
        var t2 = 0.5 - x2*x2-y2*y2;
        if(t2<0) n2 = 0.0; else { t2 *= t2; n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2); }
        return 70.0 * (n0 + n1 + n2);
    };

    var _perlin = new SimplexNoise();
    var _seed = Math.random() * 10;
    var previewed = false;
    var isApplied = false;

    // === 2. UTILS ===
    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
    function safeParse(text, defaultValue) {
        var val = parseFloat(text);
        return isNaN(val) ? defaultValue : val;
    }
    function openURL(url) {
        var html = new File(Folder.temp.absoluteURI + "/aisLink.html");
        html.open("w");
        var htmlBody = '<html><head><META HTTP-EQUIV=Refresh CONTENT="0; URL=' + url + '"></head><body></body></html>';
        html.write(htmlBody);
        html.close();
        html.execute();
    }

    // === 3. MAIN UI ===
    var main = function() {
        if (app.documents.length < 1 || app.activeDocument.selection.length < 1) {
            alert("Please select some objects first.");
            return;
        }

        var win = new Window("dialog", "PerlinFlow");
        win.orientation = "column"; win.alignChildren = ["fill", "top"];
        win.spacing = 15; win.opacity = 0.98;

        var PANEL_MARGINS = [15, 15, 10, 15];
        var CHECK_W = 70; 
        var SUB_LBL_W = 50; 
        
        var pEngine = win.add("panel", undefined, "Noise Control");
        pEngine.margins = PANEL_MARGINS; pEngine.alignChildren = "fill"; pEngine.spacing = 10;
        
        var noiseGroup = pEngine.add("group");
        noiseGroup.spacing = 10;
        var noiseFact = addField(noiseGroup, "Density", "5", SUB_LBL_W);
        var btnRandom = noiseGroup.add("button", undefined, "New Seed");
        btnRandom.preferredSize = [140, 22]; 

        var pApp = win.add("panel", undefined, "Appearance");
        pApp.margins = PANEL_MARGINS; pApp.alignChildren = "fill"; pApp.spacing = 10;

        var gFill = pApp.add("group");
        var doFill = gFill.add("checkbox", undefined, "Enable Grayscale Color");
        doFill.preferredSize.width = CHECK_W + 100; doFill.value = true;
        
        var gOpac = pApp.add("group");
        var doOpac = gOpac.add("checkbox", undefined, "Opacity");
        doOpac.preferredSize.width = CHECK_W; doOpac.value = false;
        var opacGroup = gOpac.add("group");
        var opMin = addField(opacGroup, "Min", "20", SUB_LBL_W - 20);
        var opMax = addField(opacGroup, "Max", "100", SUB_LBL_W - 20);

        var pTrans = win.add("panel", undefined, "Transformations");
        pTrans.margins = PANEL_MARGINS; pTrans.alignChildren = "fill"; pTrans.spacing = 10;

        var gPos = pTrans.add("group");
        var doPos = gPos.add("checkbox", undefined, "Position");
        doPos.preferredSize.width = CHECK_W;
        var posGroup = gPos.add("group");
        var posX = addField(posGroup, "X", "20", SUB_LBL_W - 20);
        var posY = addField(posGroup, "Y", "20", SUB_LBL_W - 20);

        var gRot = pTrans.add("group");
        var doRotate = gRot.add("checkbox", undefined, "Rotation");
        doRotate.preferredSize.width = CHECK_W;
        var rotGroup = gRot.add("group");
        var roMin = addField(rotGroup, "Min", "-30", SUB_LBL_W - 20);
        var roMax = addField(rotGroup, "Max", "30", SUB_LBL_W - 20);

        var gSclMain = pTrans.add("group");
        gSclMain.orientation = "column"; gSclMain.alignChildren = "left"; gSclMain.spacing = 5;
        var gSclTop = gSclMain.add("group");
        var doScale = gSclTop.add("checkbox", undefined, "Scale");
        doScale.preferredSize.width = CHECK_W;
        var sclGroup = gSclTop.add("group");
        var scMin = addField(sclGroup, "Min", "80", SUB_LBL_W - 20);
        var scMax = addField(sclGroup, "Max", "120", SUB_LBL_W - 20);
       
        var gSclType = gSclMain.add("group");
        gSclType.margins.left = CHECK_W - 11;
        var radUniform = gSclType.add("radiobutton", undefined, "Uniform");
        var radWidth = gSclType.add("radiobutton", undefined, "Width");
        var radHeight = gSclType.add("radiobutton", undefined, "Height");
        radUniform.value = true;

        var gBtn = win.add("group");
        gBtn.alignment = "right";
        var btnCancel = gBtn.add("button", undefined, "Cancel");
        btnCancel.preferredSize = [140, 23];
        var btnOk = gBtn.add("button", undefined, "Apply");
        btnOk.preferredSize = [140, 23]; 

        var footer = win.add("group");
        footer.alignment = "center";
        var credit = footer.add("statictext", undefined, "© 2026 NobuDesign | Youtube");
        credit.graphics.foregroundColor = credit.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.4, 0.4, 0.4, 1], 1);
        credit.addEventListener("mousedown", function() { openURL("https://www.youtube.com/@nobudesign"); });

        // === 4. UPDATE LOGIC ===
        var update = function() {
            opacGroup.enabled = doOpac.value;
            posGroup.enabled = doPos.value;
            rotGroup.enabled = doRotate.value;
            sclGroup.enabled = doScale.value;
            gSclType.enabled = doScale.value;

            if (previewed) { app.undo(); previewed = false; }
            if (!doScale.value && !doRotate.value && !doFill.value && !doPos.value && !doOpac.value) { app.redraw(); return; }

            var items = [];
            extractItems(app.activeDocument.selection, items);
            var rect = getSelectedRect(items);
            var fullLength = Math.max(rect.width, rect.height);
            var nf = safeParse(noiseFact.text, 4.0);

            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var center = getCenter(item);
                var kx = (center.x - rect.left) / (fullLength || 1) * nf;
                var ky = (center.y - rect.bottom) / (fullLength || 1) * nf;
                
                var nValRaw = _perlin.noise(_seed + kx, _seed + ky); 
                var val = nValRaw + 1;
                var t = Math.max(0, Math.min(1, val / 2)); 

                if (doPos.value) {
                    var offX = nValRaw * safeParse(posX.text, 0);
                    var nValY = _perlin.noise(_seed + 50 + kx, _seed + 50 + ky);
                    var offY = nValY * safeParse(posY.text, 0);
                    item.translate(offX, offY);
                }
                if (doScale.value) {
                    var s = val * ((safeParse(scMax.text, 100) - safeParse(scMin.text, 100)) / 2) + safeParse(scMin.text, 100);
                    item.resize(radHeight.value ? 100 : s, radWidth.value ? 100 : s, true, true, true, true, 1, Transformation.CENTER);
                }
                if (doRotate.value) {
                    var r = val * ((safeParse(roMax.text, 0) - safeParse(roMin.text, 0)) / 2) + safeParse(roMin.text, 0);
                    item.rotate(r, true, true, true, true, Transformation.CENTER);
                }
                if (doFill.value && item.typename == "PathItem") {
                    // LOGIKA FREE: HANYA GRAYSCALE
                    var gray = new RGBColor();
                    var grayVal = t * 255;
                    gray.red = gray.green = gray.blue = grayVal;
                    item.fillColor = gray;
                }
                if (doOpac.value) {
                    var oMinVal = clamp(safeParse(opMin.text, 0), 0, 100);
                    var oMaxVal = clamp(safeParse(opMax.text, 100), 0, 100);
                    item.opacity = t * (oMaxVal - oMinVal) + oMinVal;
                }
            }
            previewed = true; app.redraw();
        };

        var fields = [posX, posY, scMin, scMax, roMin, roMax, noiseFact, opMin, opMax];
        for (var i=0; i<fields.length; i++) { fields[i].onChanging = update; }

        doPos.onClick = doScale.onClick = doRotate.onClick = doFill.onClick = doOpac.onClick = update;
        radUniform.onClick = radWidth.onClick = radHeight.onClick = update;
        btnRandom.onClick = function() { _seed = Math.random() * 10; update(); };
        btnCancel.onClick = function() { win.close(); };
        btnOk.onClick = function() { isApplied = true; win.close(); };
        win.onClose = function() { if (!isApplied && previewed) { app.undo(); app.redraw(); } return true; };
        win.onShow = function() { update(); };
        win.show();

        function addField(parent, label, def, labelWidth) {
            var g = parent.add("group"); g.spacing = 3;
            var lbl = g.add("statictext", undefined, label);
            if (labelWidth) lbl.preferredSize.width = labelWidth;
            var t = g.add("edittext", undefined, def); t.characters = 4;
            t.addEventListener("keydown", function(k) {
                var val = parseFloat(this.text);
                if (isNaN(val)) return;
                var step = k.shiftKey ? 10 : 1;
                if (k.keyName == "Up") { this.text = (val + step).toString(); update(); k.preventDefault(); }
                else if (k.keyName == "Down") { this.text = (val - step).toString(); update(); k.preventDefault(); }
            });
            return t;
        }
    };

    function extractItems(sel, arr) {
        for (var i=0; i<sel.length; i++) {
            if (sel[i].typename == "GroupItem") extractItems(sel[i].pageItems, arr);
            else if (!sel[i].locked && !sel[i].hidden) arr.push(sel[i]);
        }
    }
    function getCenter(item) { return { x: item.left + item.width / 2, y: item.top - item.height / 2 }; }
    function getSelectedRect(sel) {
        if (!sel.length) return {left:0, right:0, top:0, bottom:0, width:0, height:0};
        var l = sel[0].left, r = l + sel[0].width, t = sel[0].top, b = t - sel[0].height;
        for (var i=1; i<sel.length; i++) {
            l = Math.min(l, sel[i].left); r = Math.max(r, sel[i].left + sel[i].width);
            t = Math.max(t, sel[i].top); b = Math.min(b, sel[i].top - sel[i].height);
        }
        return { left: l, right: r, top: t, bottom: b, width: r - l, height: t - b };
    }
    main();
})();