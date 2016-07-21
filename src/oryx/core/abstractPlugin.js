if (!ORYX) {
    var ORYX = {}
}
if (!ORYX.Core) {
    ORYX.Core = {}
}

ORYX.Core.AbstractPlugin = (function() {
    function AbstractPlugin(facade) {
        this.facade = facade;
        this.facade.registerOnEvent(ORYX.CONFIG.EVENT_LOADED, this.onLoaded.bind(this));
    }
    AbstractPlugin.prototype.onLoaded = function() {

    };
    AbstractPlugin.prototype.onSelectionChanged = function() {

    };
    AbstractPlugin.prototype.showOverlay = function(shapes, attributes, svgNode, svgNodePosition) {
        if (!(shapes instanceof Array)) {
            shapes = [shapes]
        }

        // Define Shapes
        shapes = shapes.map(function(shape) {
            var el = shape;
            if (typeof shape == "string") {
                el = this.facade.getCanvas().getChildShapeByResourceId(shape);
                el = el || this.facade.getCanvas().getChildById(shape, true);
            }
            return el;
        }.bind(this)).compact();

        // Define unified id
        if (!this.overlayID) {
            this.overlayID = this.type + ORYX.Editor.provideId();
        }

        this.facade.raiseEvent({
            type: ORYX.CONFIG.EVENT_OVERLAY_SHOW,
            id: this.overlayID,
            shapes: shapes,
            attributes: attributes,
            node: svgNode,
            nodePosition: svgNodePosition || "NW"
        });
    };
    AbstractPlugin.prototype.hideOverlay = function() {
        this.facade.raiseEvent({
            type: ORYX.CONFIG.EVENT_OVERLAY_HIDE,
            id: this.overlayID
        });
    };
    /**
     * Opens a new window that shows the given XML content.
     * @methodOf ORYX.Plugins.AbstractPlugin.prototype
     * @param {Object} content The XML content to be shown.
     * @example
     * openDownloadWindow( "my.xml", "<exampleXML />" );
     */
    AbstractPlugin.prototype.openXMLWindow = function(content) {

    };

    /**
     * Opens a download window for downloading the given content.
     * @methodOf ORYX.Plugins.AbstractPlugin.prototype
     * @param {String} filename The content's file name
     * @param {String} content The content to download
     */
    AbstractPlugin.prototype.openDownloadWindow = function(filename, content) {
        var win = window.open("");
        if (win != null) {
            win.document.open();
            win.document.write("<html><body>");
            var submitForm = win.document.createElement("form");
            win.document.body.appendChild(submitForm);

            var createHiddenElement = function(name, value) {
                var newElement = document.createElement("input");
                newElement.name = name;
                newElement.type = "hidden";
                newElement.value = value;
                return newElement
            }

            submitForm.appendChild(createHiddenElement("download", content));
            submitForm.appendChild(createHiddenElement("file", filename));


            submitForm.method = "POST";
            win.document.write("</body></html>");
            win.document.close();
            submitForm.action = ORYX.PATH + "/download";
            submitForm.submit();
        }
    };

    /**
     * Sets the editor in read only mode: Edges/ dockers cannot be moved anymore,
     * shapes cannot be selected anymore.
     * @methodOf ORYX.Plugins.AbstractPlugin.prototype
     */
    AbstractPlugin.prototype.enableReadOnlyMode = function() {
        //Edges cannot be moved anymore
        this.facade.disableEvent(ORYX.CONFIG.EVENT_MOUSEDOWN);

        // Stop the user from editing the diagram while the plugin is active
        this._stopSelectionChange = function() {
            if (this.facade.getSelection().length > 0) {
                this.facade.setSelection([]);
            }
        };
        this.facade.registerOnEvent(ORYX.CONFIG.EVENT_SELECTION_CHANGED, this._stopSelectionChange.bind(this));
    };
    /**
     * Disables read only mode, see @see
     * @methodOf ORYX.Plugins.AbstractPlugin.prototype
     * @see ORYX.Plugins.AbstractPlugin.prototype.enableReadOnlyMode
     */
    AbstractPlugin.prototype.disableReadOnlyMode = function() {
        // Edges can be moved now again
        this.facade.enableEvent(ORYX.CONFIG.EVENT_MOUSEDOWN);

        if (this._stopSelectionChange) {
            this.facade.unregisterOnEvent(ORYX.CONFIG.EVENT_SELECTION_CHANGED, this._stopSelectionChange.bind(this));
            this._stopSelectionChange = undefined;
        }
    };
    /**
     * Checks if a certain stencil set is loaded right now.
     * 
     */
    AbstractPlugin.prototype.isStencilSetExtensionLoaded = function(stencilSetExtensionNamespace) {
        return this.facade.getStencilSets().values().any(
            function(ss) {
                return ss.extensions().keys().any(
                    function(extensionKey) {
                        return extensionKey == stencilSetExtensionNamespace;
                    }.bind(this)
                );
            }.bind(this)
        );
    };

    /**
     * Raises an event so that registered layouters does
     * have the posiblility to layout the given shapes 
     * For further reading, have a look into the AbstractLayouter
     * class
     * @param {Object} shapes
     */
    AbstractPlugin.prototype.doLayout = function(shapes) {
        // Raises a do layout event
        this.facade.raiseEvent({
            type: ORYX.CONFIG.EVENT_LAYOUT,
            shapes: shapes
        });
    };


    /**
     * Does a primitive layouting with the incoming/outgoing 
     * edges (set the dockers to the right position) and if 
     * necessary, it will be called the real layouting 
     * @param {ORYX.Core.Node} node
     * @param {Array} edges
     */
    AbstractPlugin.prototype.layoutEdges = function(node, allEdges, offset) {
        var self = this;
        // Find all edges, which are related to the node and
        // have more than two dockers
        var edges = allEdges
            // Find all edges with more than two dockers
            .filter(function(r) {
                return r.dockers.length > 2;
            });

        if (edges.length > 0) {

            // Get the new absolute center
            var center = node.absoluteXY();

            var ulo = {
                x: center.x - offset.x,
                y: center.y - offset.y
            }

            center.x += node.bounds.width() / 2;
            center.y += node.bounds.height() / 2;

            // Get the old absolute center
            this.oldCenter = Object.clone(center);
            this.oldCenter.x -= offset ? offset.x : 0;
            this.oldCenter.y -= offset ? offset.y : 0;

            var ul = {
                x: center.x - (node.bounds.width() / 2),
                y: center.y - (node.bounds.height() / 2)
            }
            var lr = {
                x: center.x + (node.bounds.width() / 2),
                y: center.y + (node.bounds.height() / 2)
            }


            /**
             * Align the bounds if the center is 
             * the same than the old center
             * @params {Object} bounds
             * @params {Object} bounds2
             */
            var align = function(bounds, bounds2) {
                var xdif = bounds.center().x - bounds2.center().x;
                var ydif = bounds.center().y - bounds2.center().y;
                if (Math.abs(xdif) < 3) {
                    bounds.moveBy({
                        x: (offset.xs ? (((offset.xs * (bounds.center().x - ulo.x)) + offset.x + ulo.x) - bounds.center().x) : offset.x) - xdif,
                        y: 0
                    });
                } else if (Math.abs(ydif) < 3) {
                    bounds.moveBy({
                        x: 0,
                        y: (offset.ys ? (((offset.ys * (bounds.center().y - ulo.y)) + offset.y + ulo.y) - bounds.center().y) : offset.y) - ydif
                    });
                }
            };

            /**						
             * Returns a TRUE if there are bend point which overlay the shape
             */
            var isBendPointIncluded = function(edge) {
                // Get absolute bounds
                var ab = edge.dockers[0].getDockedShape();
                var bb = edge.dockers[edge.dockers.length-1].getDockedShape();

                if (ab) {
                    ab = ab.absoluteBounds();
                    ab.widen(5);
                }

                if (bb) {
                    bb = bb.absoluteBounds();
                    bb.widen(20); // Wide with 20 because of the arrow from the edge
                }

                return edge.dockers
                    .some(function(docker, i) {
                        var c = docker.bounds.center();
                        // Dont count first and last
                        return i != 0 && i != edge.dockers.length - 1 &&
                            // Check if the point is included to the absolute bounds
                            ((ab && ab.isIncluded(c)) || (bb && bb.isIncluded(c)))
                    })
            };
            // For every edge, check second and one before last docker
            // if there are horizontal/vertical on the same level
            // and if so, align the the bounds 
            edges.forEach(function(edge) {
                if (edge.dockers[0].getDockedShape() === node) {
                    var second = edge.dockers[1];
                    if (align(second.bounds, edge.dockers[0].bounds)) {
                        second.update();
                    }
                } else if (edge.dockers[edge.dockers.length-1].getDockedShape() === node) {
                    var beforeLast = edge.dockers[edge.dockers.length - 2];
                    if (align(beforeLast.bounds, edge.dockers[edge.dockers.length-1].bounds)) {
                        beforeLast.update();
                    }
                }
                edge._update(true);
                edge.removeUnusedDockers();
                if (isBendPointIncluded(edge)) {
                    self.doLayout(edge);
                    return;
                }
            });
        }

        // Find all edges, which have only to dockers 
        // and is located horizontal/vertical.
        // Do layout with those edges
        allEdges.forEach(function(edge) {
            // Find all edges with two dockers
            if (edge.dockers.length == 2) {
                var p1 = edge.dockers[0].bounds.center();
                var p2 = edge.dockers[edge.dockers.length-1].bounds.center();
                // Find all horizontal/vertical edges
                if (Math.abs(p1.x - p2.x) < 2 || Math.abs(p1.y - p2.y) < 2) {
                    edge.dockers[0].update();
                    edge.dockers[edge.dockers.length-1].update();
                    self.doLayout(edge);
                }
            }
        });
    }
    return AbstractPlugin;
}());