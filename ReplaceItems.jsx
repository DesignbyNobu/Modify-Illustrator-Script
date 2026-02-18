/* Author: Alexander Ladygin (i@ladygin.pro)
  Program version: Adobe Illustrator CC+
  Name: replaceItems_MultiGroup.jsx;
  Updated by: Gemini AI (Added Multi-Group Support)
*/

var scriptName = 'ReplaceItems (Fix Bug)',
    settingFile = {
        name: scriptName + '__setting.json',
        folder: Folder.myDocuments + '/LA_AI_Scripts/'
    };

var win = new Window('dialog', scriptName);
    win.orientation = 'column';
    win.alignChildren = ['fill', 'fill'];

with (win.add('group')) {
    orientation = 'row';
    var panel = add('panel', undefined, 'What to replace?');
        panel.orientation = 'column';
        panel.alignChildren = ['fill', 'fill'];
        panel.margins = [20, 30, 20, 20];

        var bufferRadio = panel.add('radiobutton', undefined, 'Object in buffer'),
            currentRadio = panel.add('radiobutton', undefined, 'Top object'),
            groupSuccessively = panel.add('radiobutton', undefined, 'All in group (successively)'),
            randomRadio = panel.add('radiobutton', undefined, 'All in group (random)'),
            groupValue = panel.add('group'),
            randomValue = groupValue.add('edittext', undefined, '100'),
            randomValueUnit = groupValue.add('statictext', undefined, '%'),
            elementsInGroupCheckbox = panel.add('checkbox', undefined, 'Replace items in ALL selected groups?');

        groupValue.orientation = 'row';
        randomValue.minimumSize = [140, undefined];

    var panelCheckboxes = add('panel');
        panelCheckboxes.orientation = 'column';
        panelCheckboxes.alignChildren = ['fill', 'fill'];
        var fitInSizeCheckbox = panelCheckboxes.add('checkbox', undefined, 'Fit to element size'),
            copyWHCheckbox = panelCheckboxes.add('checkbox', undefined, 'Copy Width & Height'),
            saveOriginalCheckbox = panelCheckboxes.add('checkbox', undefined, 'Save original element'),
            copyColorsCheckbox = panelCheckboxes.add('checkbox', undefined, 'Copy colors from element'),
            randomRotateCheckbox = panelCheckboxes.add('checkbox', undefined, 'Random element rotation'),
            symbolByRPCheckbox = panelCheckboxes.add('checkbox', [0, 0, 100, 40], 'Align symbols by\nregistration point');
}

var winButtons = win.add('group');
    var cancel = winButtons.add('button', undefined, 'Cancel');
    var ok = winButtons.add('button', [0, 0, 100, 30], 'OK');
    ok.onClick = startAction;

// --- Helper Functions ---
function randomRotation(item) { item.rotate(Math.floor(Math.random() * 360), true, true, true, true, Transformation.CENTER); }

function setFillColor(items, color) {
    if (!color) return;
    for (var i = 0; i < items.length; i++) {
        if (items[i].typename === 'GroupItem') setFillColor(items[i].pageItems, color);
        else if (items[i].typename === 'CompoundPathItem' && items[i].pathItems.length) items[i].pathItems[0].fillColor = color;
        else if (items[i].typename === 'PathItem') items[i].fillColor = color;
    }
}

function getFillColor(items) {
    for (var i = 0; i < items.length; i++) {
        if (items[i].typename === 'GroupItem') { var gc = getFillColor(items[i].pageItems); if (gc) return gc; }
        else if (items[i].typename === 'CompoundPathItem' && items[i].pathItems.length) return items[i].pathItems[0].fillColor;
        else if (items[i].typename === 'PathItem') return items[i].fillColor;
    }
}

function startAction() {
    if (selection.length) {
        var __ratio = !isNaN(parseFloat(randomValue.text)) ? parseFloat(randomValue.text) / 100 : 1;
        var targetItems = [];
        
        // LOGIKA BARU: Mengumpulkan semua item dari semua grup yang dipilih
        if (elementsInGroupCheckbox.value) {
            // Kita asumsikan objek master adalah selection[0] (jika tidak pakai buffer)
            // Jadi kita mulai loop target dari indeks 1 ke atas
            var startIdx = (bufferRadio.value) ? 0 : 1;
            for (var s = startIdx; s < selection.length; s++) {
                if (selection[s].typename === 'GroupItem') {
                    for (var p = 0; p < selection[s].pageItems.length; p++) {
                        targetItems.push(selection[s].pageItems[p]);
                    }
                } else {
                    targetItems.push(selection[s]);
                }
            }
        } else {
            targetItems = selection;
        }

        var nodes = (currentRadio.value ? selection[0] : (bufferRadio.value ? [] : selection[0].pageItems));
        
        if (bufferRadio.value) {
            app.paste();
            nodes = selection[0];
            selection = null;
        }

        function getNode(__index) {
            if (currentRadio.value || bufferRadio.value) return nodes;
            return nodes[typeof __index === 'number' ? __index : Math.floor(Math.random() * nodes.length)];
        }

        var j = 0;
        // Kita loop dari belakang agar penghapusan item tidak mengganggu indeks
        for (var i = targetItems.length - 1; i >= 0; i--) {
            // Lewati master object jika bukan mode buffer
            if (!bufferRadio.value && !elementsInGroupCheckbox.value && i === 0) continue;

            var item = targetItems[i];
            var node = getNode(groupSuccessively.value ? j : undefined).duplicate(item, ElementPlacement.PLACEBEFORE);
            j++;
            if (nodes.length && j >= nodes.length) j = 0;

            // Transformasi (Scale, Rotate, Position)
            if (randomRotateCheckbox.value) randomRotation(node);
            
            if (copyWHCheckbox.value) {
                node.width = item.width;
                node.height = item.height;
            } else if (fitInSizeCheckbox.value) {
                var masterDim = (node.width > node.height) ? 'width' : 'height';
                var targetDim = (item.width > item.height) ? 'width' : 'height';
                var ratio = (item[targetDim] * __ratio) / node[masterDim];
                node.width *= ratio;
                node.height *= ratio;
            }

            node.left = item.left - (node.width - item.width) / 2;
            node.top = item.top + (node.height - item.height) / 2;

            if (copyColorsCheckbox.value) setFillColor([node], getFillColor([item]));
            if (!saveOriginalCheckbox.value) item.remove();
        }

        if (bufferRadio.value) nodes.remove();
    }
    win.close();
}

win.center();
win.show(); 