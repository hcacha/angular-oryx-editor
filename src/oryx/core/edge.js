/**
 * Copyright (c) 2006
 * Martin Czuchra, Nicolas Peters, Daniel Polak, Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

/**
 * Init namespaces
 */
if (!ORYX) {
	var ORYX = {};
}
if (!ORYX.Core) {
	ORYX.Core = {};
}


/**
 * @classDescription Abstract base class for all connections.
 * @extends {ORYX.Core.Shape}
 * @param options {Object}
 *
 * TODO da die verschiebung der Edge nicht ueber eine
 *  translation gemacht wird, die sich auch auf alle kind UIObjects auswirkt,
 *  muessen die kinder hier beim verschieben speziell betrachtet werden.
 *  Das sollte ueberarbeitet werden.
 *
 */
ORYX.Core.Edge = {
	/**
	 * Constructor
	 * @param {Object} options
	 * @param {Stencil} stencil
	 */
	construct: function(options, stencil) {
		//arguments.callee.$.construct.apply(this, arguments);
		ORYX.Core.Shape.prototype.construct.apply(this, arguments);

		this.isMovable = true;
		this.isSelectable = true;

		this._dockerUpdated = false;

		this._markers = new Hash(); //a hash map of SVGMarker objects where keys are the marker ids
		this._paths = [];
		this._interactionPaths = [];
		this._dockersByPath = new Hash();
		this._markersByPath = new Hash();

		/* Data structures to store positioning information of attached child nodes */
		this.attachedNodePositionData = new Hash();

		//TODO was muss hier initial erzeugt werden?
		var stencilNode = this.node.childNodes[0].childNodes[0];
		stencilNode = ORYX.Editor.graft("http://www.w3.org/2000/svg", stencilNode, ['g', {
			"pointer-events": "painted"
		}]);

		//Add to the EventHandler
		this.addEventHandlers(stencilNode);


		this._oldBounds = this.bounds.clone();

		//load stencil
		this._init(this._stencil.view());

		if (stencil instanceof Array) {
			this.deserialize(stencil);
		}

	},

	_update: function(force) {
		var self = this;
		if (this._dockerUpdated || this.isChanged || force) {

			this.dockers.invoke("update");

			if (this.bounds.width() === 0 || this.bounds.height() === 0) {

				this.bounds.moveBy({
					x: this.bounds.width() === 0 ? -1 : 0,
					y: this.bounds.height() === 0 ? -1 : 0
				});

				this.bounds.extend({
					x: this.bounds.width() === 0 ? 2 : 0,
					y: this.bounds.height() === 0 ? 2 : 0
				});

			}

			// TODO: Bounds muss abhaengig des Eltern-Shapes gesetzt werden
			var upL = this.bounds.upperLeft();
			var oldUpL = this._oldBounds.upperLeft();
			var oldWidth = this._oldBounds.width() === 0 ? this.bounds.width() : this._oldBounds.width();
			var oldHeight = this._oldBounds.height() === 0 ? this.bounds.height() : this._oldBounds.height();
			var diffX = upL.x - oldUpL.x;
			var diffY = upL.y - oldUpL.y;
			var diffWidth = this.bounds.width() / oldWidth;
			var diffHeight = this.bounds.height() / oldHeight;

			this.dockers.forEach(function(docker) {
				// Unregister on BoundsChangedCallback
				docker.bounds.unregisterCallback(self._dockerChangedCallback);

				// If there is any changes at the edge and is there is not an DockersUpdate
				// set the new bounds to the docker
				if (!self._dockerUpdated) {
					docker.bounds.moveBy(diffX, diffY);

					if (diffWidth !== 1 || diffHeight !== 1) {
						var relX = docker.bounds.upperLeft().x - upL.x;
						var relY = docker.bounds.upperLeft().y - upL.y;

						docker.bounds.moveTo(upL.x + relX * diffWidth, upL.y + relY * diffHeight);
					}
				}
				// Do Docker update and register on DockersBoundChange
				docker.update();
				docker.bounds.registerCallback(self._dockerChangedCallback);

			});

			if (this._dockerUpdated) {
				var a = this.dockers[0].bounds.center();
				var b = Object.clone(a);

				this.dockers.forEach(function(docker) {
					var center = docker.bounds.center();
					a.x = Math.min(a.x, center.x);
					a.y = Math.min(a.y, center.y);
					b.x = Math.max(b.x, center.x);
					b.y = Math.max(b.y, center.y);
				});

				//set the bounds of the the association
				this.bounds.set(Object.clone(a), Object.clone(b));
			}



			//reposition labels
			this.getLabels().forEach(function(label) {
				switch (label.edgePosition) {
					case "freeMoved":
						label.x = label.x;
						label.y = label.y;
						break;
					case "starttop":
						var angle = self._getAngle(self.dockers[0], self.dockers[1]);
						var pos = self.dockers[0].bounds.center();

						if (angle <= 90 || angle > 270) {
							label.horizontalAlign("left");
							label.verticalAlign("bottom");
							label.x = pos.x + label.getOffsetTop();
							label.y = pos.y - label.getOffsetTop();
							label.rotate(360 - angle, pos);
						} else {
							label.horizontalAlign("right");
							label.verticalAlign("bottom");
							label.x = pos.x - label.getOffsetTop();
							label.y = pos.y - label.getOffsetTop();
							label.rotate(180 - angle, pos);
						}

						break;
					case "startbottom":
						var angle = self._getAngle(self.dockers[0], self.dockers[1]);
						var pos = self.dockers[0].bounds.center();

						if (angle <= 90 || angle > 270) {
							label.horizontalAlign("left");
							label.verticalAlign("top");
							label.x = pos.x + label.getOffsetBottom();
							label.y = pos.y + label.getOffsetBottom();
							label.rotate(360 - angle, pos);
						} else {
							label.horizontalAlign("right");
							label.verticalAlign("top");
							label.x = pos.x - label.getOffsetBottom();
							label.y = pos.y + label.getOffsetBottom();
							label.rotate(180 - angle, pos);
						}

						break;
					case "midtop":
						var numOfDockers = self.dockers.length;
						if (numOfDockers % 2 == 0) {
							var angle = self._getAngle(self.dockers[numOfDockers / 2 - 1], self.dockers[numOfDockers / 2])
							var pos1 = self.dockers[numOfDockers / 2 - 1].bounds.center();
							var pos2 = self.dockers[numOfDockers / 2].bounds.center();
							var pos = {
								x: (pos1.x + pos2.x) / 2.0,
								y: (pos1.y + pos2.y) / 2.0
							};

							label.horizontalAlign("center");
							label.verticalAlign("bottom");
							label.x = pos.x;
							label.y = pos.y - label.getOffsetTop();

							if (angle <= 90 || angle > 270) {
								label.rotate(360 - angle, pos);
							} else {
								label.rotate(180 - angle, pos);
							}
						} else {
							var index = parseInt(numOfDockers / 2);
							var angle = self._getAngle(self.dockers[index], self.dockers[index + 1])
							var pos = self.dockers[index].bounds.center();

							if (angle <= 90 || angle > 270) {
								label.horizontalAlign("left");
								label.verticalAlign("bottom");
								label.x = pos.x + label.getOffsetTop();
								label.y = pos.y - label.getOffsetTop();
								label.rotate(360 - angle, pos);
							} else {
								label.horizontalAlign("right");
								label.verticalAlign("bottom");
								label.x = pos.x - label.getOffsetTop();
								label.y = pos.y - label.getOffsetTop();
								label.rotate(180 - angle, pos);
							}
						}

						break;
					case "midbottom":
						var numOfDockers = self.dockers.length;
						if (numOfDockers % 2 == 0) {
							var angle = self._getAngle(self.dockers[numOfDockers / 2 - 1], self.dockers[numOfDockers / 2])
							var pos1 = self.dockers[numOfDockers / 2 - 1].bounds.center();
							var pos2 = self.dockers[numOfDockers / 2].bounds.center();
							var pos = {
								x: (pos1.x + pos2.x) / 2.0,
								y: (pos1.y + pos2.y) / 2.0
							};

							label.horizontalAlign("center");
							label.verticalAlign("top");
							label.x = pos.x;
							label.y = pos.y + label.getOffsetTop();

							if (angle <= 90 || angle > 270) {
								label.rotate(360 - angle, pos);
							} else {
								label.rotate(180 - angle, pos);
							}
						} else {
							var index = parseInt(numOfDockers / 2);
							var angle = self._getAngle(self.dockers[index], self.dockers[index + 1])
							var pos = self.dockers[index].bounds.center();

							if (angle <= 90 || angle > 270) {
								label.horizontalAlign("left");
								label.verticalAlign("top");
								label.x = pos.x + label.getOffsetBottom();
								label.y = pos.y + label.getOffsetBottom();
								label.rotate(360 - angle, pos);
							} else {
								label.horizontalAlign("right");
								label.verticalAlign("top");
								label.x = pos.x - label.getOffsetBottom();
								label.y = pos.y + label.getOffsetBottom();
								label.rotate(180 - angle, pos);
							}
						}

						break;
					case "endtop":
						var length = self.dockers.length;
						var angle = self._getAngle(self.dockers[length - 2], self.dockers[length - 1]);
						var pos = self.dockers.length ? self.dockers[self.dockers.length - 1].bounds.center() : 0;

						if (angle <= 90 || angle > 270) {
							label.horizontalAlign("right");
							label.verticalAlign("bottom");
							label.x = pos.x - label.getOffsetTop();
							label.y = pos.y - label.getOffsetTop();
							label.rotate(360 - angle, pos);
						} else {
							label.horizontalAlign("left");
							label.verticalAlign("bottom");
							label.x = pos.x + label.getOffsetTop();
							label.y = pos.y - label.getOffsetTop();
							label.rotate(180 - angle, pos);
						}

						break;
					case "endbottom":
						var length = self.dockers.length;
						var angle = self._getAngle(self.dockers[length - 2], self.dockers[length - 1]);
						var pos = self.dockers.length ? self.dockers[self.dockers.length - 1].bounds.center() : 0;

						if (angle <= 90 || angle > 270) {
							label.horizontalAlign("right");
							label.verticalAlign("top");
							label.x = pos.x - label.getOffsetBottom();
							label.y = pos.y + label.getOffsetBottom();
							label.rotate(360 - angle, pos);
						} else {
							label.horizontalAlign("left");
							label.verticalAlign("top");
							label.x = pos.x + label.getOffsetBottom();
							label.y = pos.y + label.getOffsetBottom();
							label.rotate(180 - angle, pos);
						}

						break;
				}
			});

			this.children.forEach(function(value) {
				if (value instanceof ORYX.Core.Node) {
					self.calculatePositionOfAttachedChildNode.call(self, value);
				}
			});

			this.refreshAttachedNodes();
			this.refresh();

			this.isChanged = false;
			this._dockerUpdated = false;

			this._oldBounds = this.bounds.clone();
		}


	},

	/**
	 *  Moves a point to the upperLeft of a node's bounds.
	 *  
	 *  @param {point} point
	 *  	The point to move
	 *  @param {ORYX.Core.Bounds} bounds
	 *  	The Bounds of the related noe
	 */
	movePointToUpperLeftOfNode: function(point, bounds) {
		point.x -= bounds.width() / 2;
		point.y -= bounds.height() / 2;
	},

	/**
	 * Refreshes the visual representation of edge's attached nodes.
	 */
	refreshAttachedNodes: function() {
		var self = this;
		this.attachedNodePositionData.values().forEach(function(nodeData) {
			var startPoint = nodeData.segment.docker1.bounds.center();
			var endPoint = nodeData.segment.docker2.bounds.center();
			self.relativizePoint(startPoint);
			self.relativizePoint(endPoint);

			var newNodePosition = new Object();

			/* Calculate new x-coordinate */
			newNodePosition.x = startPoint.x + nodeData.relativDistanceFromDocker1 * (endPoint.x - startPoint.x);

			/* Calculate new y-coordinate */
			newNodePosition.y = startPoint.y + nodeData.relativDistanceFromDocker1 * (endPoint.y - startPoint.y);

			/* Convert new position to the upper left of the node */
			self.movePointToUpperLeftOfNode(newNodePosition, nodeData.node.bounds);

			/* Move node to its new position */
			nodeData.node.bounds.moveTo(newNodePosition);
			nodeData.node._update();

		});
	},

	/**
	 * Calculates the position of an edge's child node. The node is placed on 
	 * the path of the edge.
	 * 
	 * @param {node}
	 * 		The node to calculate the new position
	 * @return {Point}
	 * 		The calculated upper left point of the node's shape.
	 */
	calculatePositionOfAttachedChildNode: function(node) {
		/* Initialize position */
		var position = new Object();
		position.x = 0;
		position.y = 0;

		/* Case: Node was just added */
		if (!this.attachedNodePositionData[node.getId()]) {
			this.attachedNodePositionData[node.getId()] = new Object();
			this.attachedNodePositionData[node.getId()]
				.relativDistanceFromDocker1 = 0;
			this.attachedNodePositionData[node.getId()].node = node;
			this.attachedNodePositionData[node.getId()].segment = new Object();
			this.findEdgeSegmentForNode(node);
		} else if (node.isChanged) {
			this.findEdgeSegmentForNode(node);
		}



	},

	/**
	 * Finds the appropriate edge segement for a node.
	 * The segment is choosen, which has the smallest distance to the node.
	 * 
	 * @param {ORYX.Core.Node} node
	 * 		The concerning node
	 */
	findEdgeSegmentForNode: function(node) {
		var length = this.dockers.length;
		var smallestDistance = undefined;

		for (i = 1; i < length; i++) {
			var lineP1 = this.dockers[i - 1].bounds.center();
			var lineP2 = this.dockers[i].bounds.center();
			this.relativizePoint(lineP1);
			this.relativizePoint(lineP2);
			//position übergeben hier
			var nodeCenterPoint = node.bounds.center();
			var distance = ORYX.Core.Math.distancePointLinie(
				lineP1,
				lineP2,
				nodeCenterPoint,
				true);

			if ((distance || distance == 0) && ((!smallestDistance && smallestDistance != 0) || distance < smallestDistance)) {

				smallestDistance = distance;

				this.attachedNodePositionData[node.getId()].segment.docker1 =
					this.dockers[i - 1];
				this.attachedNodePositionData[node.getId()].segment.docker2 =
					this.dockers[i];

			}

			/* Either the distance does not match the segment or the distance
			 * between docker1 and docker2 is 0
			 * 
			 * In this case choose the nearest docker as attaching point.
			 * 
			 */
			if (!distance && !smallestDistance && smallestDistance != 0) {
				(ORYX.Core.Math.getDistancePointToPoint(nodeCenterPoint, lineP1) < ORYX.Core.Math.getDistancePointToPoint(nodeCenterPoint, lineP2)) ?
				this.attachedNodePositionData[node.getId()].relativDistanceFromDocker1 = 0:
					this.attachedNodePositionData[node.getId()].relativDistanceFromDocker1 = 1;
				this.attachedNodePositionData[node.getId()].segment.docker1 =
					this.dockers[i - 1];
				this.attachedNodePositionData[node.getId()].segment.docker2 =
					this.dockers[i];
			}
		}

		/* Calculate position on edge segment for the node */
		if (smallestDistance || smallestDistance == 0) {
			this.attachedNodePositionData[node.getId()].relativDistanceFromDocker1 =
				this.getLineParameterForPosition(
					this.attachedNodePositionData[node.getId()].segment.docker1,
					this.attachedNodePositionData[node.getId()].segment.docker2,
					node);
		}
	},

	/**
	 * Returns the value of the scalar to determine the position of the node on 
	 * line defined by docker1 and docker2.
	 * 
	 * @param {point} docker1
	 * 		The docker that defines the start of the line segment
	 * @param {point} docker2
	 * 		The docker that defines the end of the line segment
	 * @param {ORYX.Core.Node} node
	 * 		The concerning node
	 * 
	 * @return {float} positionParameter
	 * 		The scalar value to determine the position on the line
	 */
	getLineParameterForPosition: function(docker1, docker2, node) {
		var dockerPoint1 = docker1.bounds.center();
		var dockerPoint2 = docker2.bounds.center();
		this.relativizePoint(dockerPoint1);
		this.relativizePoint(dockerPoint2);

		var intersectionPoint = ORYX.Core.Math.getPointOfIntersectionPointLine(
			dockerPoint1,
			dockerPoint2,
			node.bounds.center(), true);
		if (!intersectionPoint) {
			return 0;
		}

		var relativeDistance =
			ORYX.Core.Math.getDistancePointToPoint(intersectionPoint, dockerPoint1) /
			ORYX.Core.Math.getDistancePointToPoint(dockerPoint1, dockerPoint2);

		return relativeDistance;
	},
	/**
	 * Makes point relative to the upper left of the edge's bound.
	 * 
	 * @param {point} point
	 * 		The point to relativize
	 */
	relativizePoint: function(point) {
		point.x -= this.bounds.upperLeft().x;
		point.y -= this.bounds.upperLeft().y;
	},

	refresh: function() {
		var self = this;
		//call base class refresh method
		//arguments.callee.$.refresh.apply(this, arguments);
		ORYX.Core.Shape.prototype.refresh.apply(this, arguments);

		//TODO consider points for marker mids
		var lastPoint;
		this._paths.forEach(function(path, index) {
			var dockers = self._dockersByPath[path.id];
			var c = undefined;
			var d = undefined;
			if (lastPoint) {
				d = "M" + lastPoint.x + " " + lastPoint.y;
			} else {
				c = dockers[0].bounds.center();
				lastPoint = c;

				d = "M" + c.x + " " + c.y;
			}

			for (var i = 1; i < dockers.length; i++) {
				// for each docker, draw a line to the center
				c = dockers[i].bounds.center();
				d = d + "L" + c.x + " " + c.y + " ";
				lastPoint = c;
			}

			path.setAttributeNS(null, "d", d);
			self._interactionPaths[index].setAttributeNS(null, "d", d);

		});


		/* move child shapes of an edge */
		if (this.getChildNodes().length > 0) {
			var x = this.bounds.upperLeft().x;
			var y = this.bounds.upperLeft().y;

			this.node.firstChild.childNodes[1].setAttributeNS(null, "transform", "translate(" + x + ", " + y + ")");
		}

	},

	/**
	 * Calculate the Border Intersection Point between two points
	 * @param {PointA}
	 * @param {PointB}
	 */
	getIntersectionPoint: function() {

		var length = Math.floor(this.dockers.length / 2)

		return ORYX.Core.Math.midPoint(this.dockers[length - 1].bounds.center(), this.dockers[length].bounds.center())
	},


	/**
	 * Calculate if the point is inside the Shape
	 * @param {PointX}
	 * @param {PointY} 
	 */
	isPointIncluded: function(pointX, pointY) {

		var isbetweenAB = this.absoluteBounds().isIncluded(pointX, pointY,
			ORYX.CONFIG.OFFSET_EDGE_BOUNDS);

		var isPointIncluded = undefined;

		if (isbetweenAB && this.dockers.length > 0) {

			var i = 0;
			var point1, point2;


			do {

				point1 = this.dockers[i].bounds.center();
				point2 = this.dockers[++i].bounds.center();

				isPointIncluded = ORYX.Core.Math.isPointInLine(pointX, pointY,
					point1.x, point1.y,
					point2.x, point2.y,
					ORYX.CONFIG.OFFSET_EDGE_BOUNDS);

			} while (!isPointIncluded && i < this.dockers.length - 1)

		}

		return isPointIncluded;

	},


	/**
	 * Calculate if the point is over an special offset area
	 * @param {Point}
	 */
	isPointOverOffset: function() {
		return false
	},

	/**
	 * Returns the angle of the line between two dockers
	 * (0 - 359.99999999)
	 */
	_getAngle: function(docker1, docker2) {
		var p1 = docker1.absoluteCenterXY();
		var p2 = docker2.absoluteCenterXY();

		if (p1.x == p2.x && p1.y == p2.y)
			return 0;

		var angle = Math.asin(Math.sqrt(Math.pow(p1.y - p2.y, 2)) / (Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p1.y - p2.y, 2)))) * 180 / Math.PI;

		if (p2.x >= p1.x && p2.y <= p1.y)
			return angle;
		else if (p2.x < p1.x && p2.y <= p1.y)
			return 180 - angle;
		else if (p2.x < p1.x && p2.y > p1.y)
			return 180 + angle;
		else
			return 360 - angle;
	},

	alignDockers: function() {
		var self = this;
		this._update(true);

		var firstPoint = this.dockers[0].bounds.center();
		var lastPoint = this.dockers[this.dockers.length - 1].bounds.center();

		var deltaX = lastPoint.x - firstPoint.x;
		var deltaY = lastPoint.y - firstPoint.y;

		var numOfDockers = this.dockers.length - 1;

		this.dockers.forEach(function(docker, index) {
			var part = index / numOfDockers;
			docker.bounds.unregisterCallback(self._dockerChangedCallback);
			docker.bounds.moveTo(firstPoint.x + part * deltaX, firstPoint.y + part * deltaY);
			docker.bounds.registerCallback(self._dockerChangedCallback);
		});

		this._dockerChanged();
	},

	add: function(shape) {
		//arguments.callee.$.add.apply(this, arguments);
		ORYX.Core.Shape.prototype.add.apply(this, arguments);

		// If the new shape is a Docker which is not contained
		if (shape instanceof ORYX.Core.Controls.Docker && this.dockers.include(shape)) {
			// Add it to the dockers list ordered by paths		
			var pathArray = this._dockersByPath.values()[0];
			if (pathArray) {
				pathArray.splice(this.dockers.indexOf(shape), 0, shape);
			}

			/* Perform nessary adjustments on the edge's child shapes */
			this.handleChildShapesAfterAddDocker(shape);
		}
	},

	/**
	 * Performs nessary adjustments on the edge's child shapes.
	 * 
	 * @param {ORYX.Core.Controls.Docker} docker
	 * 		The added docker
	 */
	handleChildShapesAfterAddDocker: function(docker) {
		/* Ensure type of Docker */
		if (!docker instanceof ORYX.Core.Controls.Docker) {
			return undefined;
		}

		var index = this.dockers.indexOf(docker);
		if (!(0 < index && index < this.dockers.length - 1)) {
			/* Exception: Expect added docker between first and last node of the edge */
			return undefined;
		}

		/* Get child nodes concerning the segment of the new docker */
		var startDocker = this.dockers[index - 1];
		var endDocker = this.dockers[index + 1];

		/* Adjust the position of edge's child nodes */
		var segmentElements =
			this.getAttachedNodePositionDataForSegment(startDocker, endDocker);

		var lengthSegmentPart1 = ORYX.Core.Math.getDistancePointToPoint(
			startDocker.bounds.center(),
			docker.bounds.center());
		var lengthSegmentPart2 = ORYX.Core.Math.getDistancePointToPoint(
			endDocker.bounds.center(),
			docker.bounds.center());

		if (!(lengthSegmentPart1 + lengthSegmentPart2)) {
			return;
		}

		var relativDockerPosition = lengthSegmentPart1 / (lengthSegmentPart1 + lengthSegmentPart2);

		segmentElements.forEach(function(nodePositionData) {
			/* Assign child node to the new segment */
			if (nodePositionData.value.relativDistanceFromDocker1 < relativDockerPosition) {
				/* Case: before added Docker */
				nodePositionData.value.segment.docker2 = docker;
				nodePositionData.value.relativDistanceFromDocker1 =
					nodePositionData.value.relativDistanceFromDocker1 / relativDockerPosition;
			} else {
				/* Case: after added Docker */
				nodePositionData.value.segment.docker1 = docker;
				var newFullDistance = 1 - relativDockerPosition;
				var relativPartOfSegment =
					nodePositionData.value.relativDistanceFromDocker1 - relativDockerPosition;

				nodePositionData.value.relativDistanceFromDocker1 =
					relativPartOfSegment / newFullDistance;

			}
		})

		/* Update attached nodes visual representation */
		this.refreshAttachedNodes();
	},

	/**
	 *	Returns elements from {@link attachedNodePositiondata} that match the
	 *  segement defined by startDocker and endDocker.
	 *  
	 *  @param {ORYX.Core.Controls.Docker} startDocker
	 *  	The docker defining the begin of the segment.
	 *  @param {ORYX.Core.Controls.Docker} endDocker
	 *  	The docker defining the begin of the segment.
	 *  
	 *  @return {Hash} attachedNodePositionData
	 *  	Child elements matching the segment
	 */
	getAttachedNodePositionDataForSegment: function(startDocker, endDocker) {
		/* Ensure that the segment is defined correctly */
		if (!((startDocker instanceof ORYX.Core.Controls.Docker) && (endDocker instanceof ORYX.Core.Controls.Docker))) {
			return [];
		}

		/* Get elements of the segment */
		var elementsOfSegment = [];


		this.attachedNodePositionData._each(function(nodePositionData) {
			if(nodePositionData.value.segment.docker1 === startDocker &&
				nodePositionData.value.segment.docker2 === endDocker){
					elementsOfSegment.push(nodePositionData);
			}			
		});

		/* Return a Hash in each case */
		if (!elementsOfSegment) {
			return [];
		}

		return elementsOfSegment;
	},

	/**
	 * Removes an edge's child shape
	 */
	remove: function(shape) {
		//arguments.callee.$.remove.apply(this, arguments);
		ORYX.Core.Shape.prototype.remove.apply(this, arguments);

		if (this.attachedNodePositionData[shape.getId()]) {
			delete this.attachedNodePositionData[shape.getId()];
		}

		/* Adjust child shapes if neccessary */
		if (shape instanceof ORYX.Core.Controls.Docker) {
			this.handleChildShapesAfterRemoveDocker(shape);
		}
	},

	/**
	 * 	Adjusts the child shapes of an edges after a docker was removed.
	 * 	
	 *  @param{ORYX.Core.Controls.Docker} docker
	 *  	The removed docker.
	 */
	handleChildShapesAfterRemoveDocker: function(docker) {
		var self = this;
		/* Ensure docker type */
		if (!(docker instanceof ORYX.Core.Controls.Docker)) {
			return;
		}

		this.attachedNodePositionData._each(function(nodePositionData) {
			if (nodePositionData.value.segment.docker1 === docker) {
				/* The new start of the segment is the predecessor of docker2. */
				var index = self.dockers.indexOf(nodePositionData.value.segment.docker2);
				if (index == -1) {
					return;
				}
				nodePositionData.value.segment.docker1 = self.dockers[index - 1];
			} else if (nodePositionData.value.segment.docker2 === docker) {
				/* The new end of the segment is the successor of docker1. */
				var index = self.dockers.indexOf(nodePositionData.value.segment.docker1);
				if (index == -1) {
					return;
				}
				nodePositionData.value.segment.docker2 = self.dockers[index + 1];
			}
		});

		/* Update attached nodes visual representation */
		this.refreshAttachedNodes();
	},

	/**
	 *@deprecated Use the .createDocker() Method and set the point via the bounds
	 */
	addDocker: function(position, exDocker) {
		var self = this;
		var lastDocker;
		var result;
		this._dockersByPath.any(function(pair) {
			return pair.value.any(function(docker, index) {
				if (!lastDocker) {
					lastDocker = docker;
					return false;
				} else {
					var point1 = lastDocker.bounds.center();
					var point2 = docker.bounds.center();

					if (ORYX.Core.Math.isPointInLine(position.x, position.y, point1.x, point1.y, point2.x, point2.y, 10)) {
						var path = self._paths.find(function(path) {
							return path.id === pair.key;
						});
						if (path) {
							var allowAttr = path.getAttributeNS(ORYX.CONFIG.NAMESPACE_ORYX || "http://www.b3mn.org/oryx", 'allowDockers');
							if (allowAttr && allowAttr.toLowerCase() === "no") {
								return true;
							}
						}
						var newDocker = (exDocker) ? exDocker : self.createDocker(self.dockers.indexOf(lastDocker) + 1, position);
						newDocker.bounds.centerMoveTo(position);
						if (exDocker)
							self.add(newDocker, self.dockers.indexOf(lastDocker) + 1);
						// Remove new Docker from 'to add' dockers
						//pair.value = pair.value.without(newDocker);
						//pair.value.splice(this.dockers.indexOf(lastDocker) + 1, 0, newDocker);
						// Remove the Docker from the Docker list and add the Docker to the new position
						//this.dockers = this.dockers.without(newDocker);
						//this.dockers.splice(this.dockers.indexOf(lastDocker) + 1, 0, newDocker);
						//this._update(true);
						result = newDocker;
						return true;
					} else {
						lastDocker = docker;
						return false;
					}
				}
			});
		});
		return result;
	},

	removeDocker: function(docker) {
		var self=this;
		if (this.dockers.length > 2 && !(this.dockers[0] === docker)) {
			this._dockersByPath.any(function(pair) {
				if (pair.value.indexOf(docker) > -1) {
					if (docker === pair.value[pair.value.length - 1]) {
						return true;
					} else {
						self.remove(docker);
						self._dockersByPath[pair.key] = pair.value.filter(function(item) {
							return item != docker;
						});
						self.isChanged = true;
						self._dockerChanged();
						return true;
					}
				}
				return false;
			});
		}
	},

	/**
	 * Removes all dockers from the edge which are on 
	 * the line between two dockers
	 * @return {Object} Removed dockers in an indicied array 
	 * (key is the removed position of the docker, value is docker themselve)
	 */
	removeUnusedDockers: function() {
		var self = this;
		var marked = $H({});

		this.dockers.forEach(function(docker, i) {
			if (i == 0 || i == self.dockers.length - 1) {
				return
			}
			var previous = self.dockers[i - 1];

			/* Do not consider already removed dockers */
			if (marked.values().indexOf(previous) != -1 && self.dockers[i - 2]) {
				previous = self.dockers[i - 2];
			}
			var next = self.dockers[i + 1];

			var cp = previous.getDockedShape() && previous.referencePoint ? previous.getAbsoluteReferencePoint() : previous.bounds.center();
			var cn = next.getDockedShape() && next.referencePoint ? next.getAbsoluteReferencePoint() : next.bounds.center();
			var cd = docker.bounds.center();

			if (ORYX.Core.Math.isPointInLine(cd.x, cd.y, cp.x, cp.y, cn.x, cn.y, 1)) {
				marked[i] = docker;
			}
		});

		marked._each(function(docker) {
			self.removeDocker(docker.value);
		});

		if (marked.values().length > 0) {
			self._update(true);
		}

		return marked;
	},

	/**
	 * Initializes the Edge after loading the SVG representation of the edge.
	 * @param {SVGDocument} svgDocument
	 */
	_init: function(svgDocument) {
		var self = this;
		//arguments.callee.$._init.apply(this, arguments);
		ORYX.Core.Shape.prototype._init.apply(this, arguments);

		var minPointX, minPointY, maxPointX, maxPointY;

		//init markers
		var defs = svgDocument.getElementsByTagNameNS(ORYX.CONFIG.NAMESPACE_SVG || "http://www.w3.org/2000/svg", "defs");
		if (defs.length > 0) {
			defs = defs[0];
			var markerElements = defs.getElementsByTagNameNS(ORYX.CONFIG.NAMESPACE_SVG || "http://www.w3.org/2000/svg", "marker");
			var marker;
			var me = this;
			for (var i = 0; i < markerElements.length; i++) {
				var markerElement = markerElements[i];
				try {
					marker = new ORYX.Core.SVG.SVGMarker(markerElement.cloneNode(true));
					me._markers[marker.id] = marker;
					var textElements = marker.element.getElementsByTagNameNS(ORYX.CONFIG.NAMESPACE_SVG || "http://www.w3.org/2000/svg", "text");
					var label;
					for (var j = 0; j < textElements.length; j++) {
						var textElement = textElements[j];
						label = new ORYX.Core.SVG.Label({
							textElement: textElement,
							shapeId: this.id
						});
						me._labels[label.id] = label;
					}
				} catch (e) {}
			}
		}


		var gs = svgDocument.getElementsByTagNameNS(ORYX.CONFIG.NAMESPACE_SVG || "http://www.w3.org/2000/svg", "g");
		if (gs.length <= 0) {
			throw "Edge: No g element found.";
		}
		var g = gs[0];


		g.setAttributeNS(null, "id", null);

		var isFirst = true;

		g.childNodes.forEach(function(path, index) {
			if (ORYX.Editor.checkClassType(path, SVGPathElement)) {
				path = path.cloneNode(false);

				var pathId = self.id + "_" + index;
				path.setAttributeNS(null, "id", pathId);
				self._paths.push(path);

				//check, if markers are set and update the id
				var markersByThisPath = [];
				var markerUrl = path.getAttributeNS(null, "marker-start");

				if (markerUrl && markerUrl !== "") {
					markerUrl = markerUrl.trim();
					markerUrl = markerUrl.replace(/^url\(#/, '');
					var markerStartId = self.id.concat(markerUrl.replace(/\)$/, ''));
					path.setAttributeNS(null, "marker-start", "url(#" + markerStartId + ")");

					markersByThisPath.push(self._markers[markerStartId]);
				}

				markerUrl = path.getAttributeNS(null, "marker-mid");

				if (markerUrl && markerUrl !== "") {
					markerUrl = markerUrl.trim();
					markerUrl = markerUrl.replace(/^url\(#/, '');
					var markerMidId = self.id.concat(markerUrl.replace(/\)$/, ''));
					path.setAttributeNS(null, "marker-mid", "url(#" + markerMidId + ")");

					markersByThisPath.push(self._markers[markerMidId]);
				}

				markerUrl = path.getAttributeNS(null, "marker-end");

				if (markerUrl && markerUrl !== "") {
					markerUrl = markerUrl.trim();
					markerUrl = markerUrl.replace(/^url\(#/, '');
					var markerEndId = self.id.concat(markerUrl.replace(/\)$/, ''));
					path.setAttributeNS(null, "marker-end", "url(#" + markerEndId + ")");

					markersByThisPath.push(self._markers[markerEndId]);
				}

				self._markersByPath[pathId] = markersByThisPath;

				//init dockers
				var parser = new PathParser();
				var handler = new ORYX.Core.SVG.PointsPathHandler();
				parser.setHandler(handler);
				parser.parsePath(path);

				if (handler.points.length < 4) {
					throw "Edge: Path has to have two or more points specified.";
				}

				self._dockersByPath[pathId] = [];

				for (var i = 0; i < handler.points.length; i += 2) {
					//handler.points.each((function(point, pIndex){
					var x = handler.points[i];
					var y = handler.points[i + 1];
					if (isFirst || i > 0) {
						var docker = new ORYX.Core.Controls.Docker({
							eventHandlerCallback: self.eventHandlerCallback
						});
						docker.bounds.centerMoveTo(x, y);
						docker.bounds.registerCallback(self._dockerChangedCallback);
						self.add(docker, self.dockers.length);

						//this._dockersByPath[pathId].push(docker);

						//calculate minPoint and maxPoint
						if (minPointX) {
							minPointX = Math.min(x, minPointX);
							minPointY = Math.min(y, minPointY);
						} else {
							minPointX = x;
							minPointY = y;
						}

						if (maxPointX) {
							maxPointX = Math.max(x, maxPointX);
							maxPointY = Math.max(y, maxPointY);
						} else {
							maxPointX = x;
							maxPointY = y;
						}
					}
					//}).bind(this));
				}
				isFirst = false;
			}
		});

		this.bounds.set(minPointX, minPointY, maxPointX, maxPointY);

		if (this.bounds.width() === 0 || this.bounds.height() === 0) {
			this.bounds.extend({
				x: this.bounds.width() === 0 ? 2 : 0,
				y: this.bounds.height() === 0 ? 2 : 0
			});

			this.bounds.moveBy({
				x: this.bounds.width() === 0 ? -1 : 0,
				y: this.bounds.height() === 0 ? -1 : 0
			});

		}

		this._oldBounds = this.bounds.clone();

		//add paths to this.node
		this._paths.reverse();
		var paths = [];
		this._paths.forEach(function(path) {
			paths.push(self.node.childNodes[0].childNodes[0].childNodes[0].appendChild(path));
		});

		this._paths = paths;

		//init interaction path
		this._paths.forEach(function(path) {
			var iPath = path.cloneNode(false);
			iPath.setAttributeNS(null, "id", undefined);
			iPath.setAttributeNS(null, "stroke-width", 10);
			iPath.setAttributeNS(null, "visibility", "hidden");
			iPath.setAttributeNS(null, "stroke-dasharray", null);
			iPath.setAttributeNS(null, "stroke", "black");
			iPath.setAttributeNS(null, "fill", "none");
			self._interactionPaths.push(self.node.childNodes[0].childNodes[0].childNodes[0].appendChild(iPath));
		});

		this._paths.reverse();
		this._interactionPaths.reverse();

		/**initialize labels*/
		var textElems = svgDocument.getElementsByTagNameNS(ORYX.CONFIG.NAMESPACE_SVG, 'text');
		for (var i = 0; i < textElems.length; i++) {
			var textElem = textElems[i];
			var label = new ORYX.Core.SVG.Label({
				textElement: textElem,
				shapeId: self.id
			});
			self.node.childNodes[0].childNodes[0].appendChild(label.node);
			self._labels[label.id] = label;

		}

		//set title
		this.node.childNodes[0].childNodes[0].setAttributeNS(null, "title", this.getStencil().title());

		this.propertiesChanged._each(function(pair) {
			pair.value = true;
		});

		//this._update(true);
	},

	/**
	 * Adds all necessary markers of this Edge to the SVG document.
	 * Has to be called, while this.node is part of DOM.
	 */
	addMarkers: function(defs) {
		this._markers._each(function(marker) {
			if (!defs.ownerDocument.getElementById(marker.value.id)) {
				marker.value.element = defs.appendChild(marker.value.element);
			}
		});
	},

	/**
	 * Removes all necessary markers of this Edge from the SVG document.
	 * Has to be called, while this.node is part of DOM.
	 */
	removeMarkers: function() {
		var svgElement = this.node.ownerSVGElement;
		if (svgElement) {
			var defs = svgElement.getElementsByTagNameNS(ORYX.CONFIG.NAMESPACE_SVG || "http://www.w3.org/2000/svg", "defs");
			if (defs.length > 0) {
				defs = defs[0];
				this._markers.forEach(function(marker) {
					var foundMarker = defs.ownerDocument.getElementById(marker.value.id);
					if (foundMarker) {
						marker.value.element = defs.removeChild(marker.value.element);
					}
				});
			}
		}
	},

	/**
	 * Calls when a docker has changed
	 */
	_dockerChanged: function() {

		//this._update(true);
		this._dockerUpdated = true;

	},

	serialize: function() {
		var result = arguments.callee.$.serialize.apply(this);

		//add dockers triple
		var value = "";
		this._dockersByPath.forEach((function(pair) {
			pair.value.forEach(function(docker) {
				var position = docker.getDockedShape() && docker.referencePoint ? docker.referencePoint : docker.bounds.center();
				value = value.concat(position.x + " " + position.y + " ");
			});

			value += " # ";
		}).bind(this));
		result.push({
			name: 'dockers',
			prefix: 'oryx',
			value: value,
			type: 'literal'
		});

		//add parent triple dependant on the dockedShapes
		//TODO change this when canvas becomes a resource
		/*        var source = this.dockers[0].getDockedShape();
		        var target = this.dockers.last().getDockedShape();
		        var sharedParent;
		        if (source && target) {
		            //get shared parent
		            while (source.parent) {
		                source = source.parent;
		                if (source instanceof ORYX.Core.Canvas) {
		                    sharedParent = source;
		                    break;
		                }
		                else {
		                    var targetParent = target.parent;
		                    var found;
		                    while (targetParent) {
		                        if (source === targetParent) {
		                            sharedParent = source;
		                            found = true;
		                            break;
		                        }
		                        else {
		                            targetParent = targetParent.parent;
		                        }
		                    }
		                    if (found) {
		                        break;
		                    }
		                }
		            }
		        }
		        else 
		            if (source) {
		                sharedParent = source.parent;
		            }
		            else 
		                if (target) {
		                    sharedParent = target.parent;
		                }
		*/
		//if (sharedParent) {
		/*            result.push({
		                name: 'parent',
		                prefix: 'raziel',
		                //value: '#' + ERDF.__trimHashes(sharedParent.resourceId),
		                value: '#' + ERDF.__trimHashes(this.getCanvas().resourceId),
		                type: 'resource'
		            });*/
		//}

		//serialize target and source
		var lastDocker = this.dockers.length ? this.dockers[this.dockers.length - 1] : null;

		var target = lastDocker ? lastDocker.getDockedShape() : null;

		if (target) {
			result.push({
				name: 'target',
				prefix: 'raziel',
				value: '#' + ERDF.__trimHashes(target.resourceId),
				type: 'resource'
			});
		}

		try {
			//result = this.getStencil().serialize(this, result);
			var serializeEvent = this.getStencil().serialize();

			/*
			 * call serialize callback by reference, result should be found
			 * in serializeEvent.result
			 */
			if (serializeEvent.type) {
				serializeEvent.shape = this;
				serializeEvent.data = result;
				serializeEvent.result = undefined;
				serializeEvent.forceExecution = true;

				this._delegateEvent(serializeEvent);

				if (serializeEvent.result) {
					result = serializeEvent.result;
				}
			}
		} catch (e) {}
		return result;
	},

	deserialize: function(data) {
		var self = this;
		try {
			//data = this.getStencil().deserialize(this, data);

			var deserializeEvent = this.getStencil().deserialize();

			/*
			 * call serialize callback by reference, result should be found
			 * in serializeEventInfo.result
			 */
			if (deserializeEvent.type) {
				deserializeEvent.shape = this;
				deserializeEvent.data = data;
				deserializeEvent.result = undefined;
				deserializeEvent.forceExecution = true;

				this._delegateEvent(deserializeEvent);
				if (deserializeEvent.result) {
					data = deserializeEvent.result;
				}
			}
		} catch (e) {}

		// Set the outgoing shapes
		var target = data.find(function(ser) {
			return (ser.prefix + "-" + ser.name) == 'raziel-target'
		});
		var targetShape;
		if (target) {
			targetShape = this.getCanvas().getChildShapeByResourceId(target.value);
		}

		var outgoing = data.filter(function(ser) {
			return (ser.prefix + "-" + ser.name) == 'raziel-outgoing'
		});
		outgoing.forEach(function(obj) {
			// TODO: Look at Canvas
			if (!self.parent) {
				return
			};

			// Set outgoing Shape
			var next = self.getCanvas().getChildShapeByResourceId(obj.value);

			if (next) {
				if (next == targetShape && self.dockers.length) {
					// If self is an edge, set the last docker to the next shape
					var lastDocker = self.dockers[self.dockers.length - 1];
					lastDocker.setDockedShape(next);
					lastDocker.setReferencePoint({
						x: next.bounds.width() / 2.0,
						y: next.bounds.height() / 2.0
					});
				} else if (next instanceof ORYX.Core.Edge && next.dockers.length) {
					//Set the first docker of the next shape
					next.dockers[0].setDockedShape(self);
					//next.dockers[0].setReferencePoint({x: this.bounds.width() / 2.0, y: this.bounds.height() / 2.0});
				}
				/*else if(next.dockers.length > 0) { //next is a node and next has a docker
					next.dockers[0].setDockedShape(this);
					next.dockers[0].setReferencePoint({x: this.bounds.width() / 2.0, y: this.bounds.height() / 2.0});
				}*/
			}

		});

		//arguments.callee.$.deserialize.apply(this, [data]);
		ORYX.Core.Shape.prototype.deserialize.apply(this, [data]);

		var oryxDockers = data.find(function(obj) {
			return (obj.prefix === "oryx" &&
				obj.name === "dockers");
		});

		if (oryxDockers) {
			var dataByPath = oryxDockers.value.split("#");

			dataByPath.forEach(function(data, index) {
				if (data == "" || data == " ") return;
				var values = data.replace(/,/g, " ").split(" ").filter(function(item) {
					return item != '';
				});

				//for each docker two values must be defined
				if (values.length % 2 === 0) {
					var path = self._paths[index];

					if (path) {
						if (index === 0) {
							while (self._dockersByPath[path.id].length > 2) {
								self.removeDocker(self._dockersByPath[path.id][1]);
							}
						} else {
							while (self._dockersByPath[path.id].length > 1) {
								self.removeDocker(self._dockersByPath[path.id][0]);
							}
						}

						var dockersByPath = self._dockersByPath[path.id];

						if (index === 0 && dockersByPath.length) {
							//set position of first docker
							var x = parseFloat(values.shift());
							var y = parseFloat(values.shift());

							if (dockersByPath[0].getDockedShape()) {
								dockersByPath[0].setReferencePoint({
									x: x,
									y: y
								});
							} else {
								dockersByPath[0].bounds.centerMoveTo(x, y);
							}
						}

						//set position of last docker
						y = parseFloat(values.pop());
						x = parseFloat(values.pop());
						var lastDockersByPath = dockersByPath.length ? dockersByPath[dockersByPath.length - 1] : null;
						if (lastDockersByPath) {
							if (lastDockersByPath.getDockedShape()) {
								lastDockersByPath.setReferencePoint({
									x: x,
									y: y
								});
							} else {
								lastDockersByPath.bounds.centerMoveTo(x, y);
							}
						}


						//add additional dockers
						for (var i = 0; i < values.length; i++) {
							x = parseFloat(values[i]);
							y = parseFloat(values[++i]);

							var newDocker = self.createDocker();
							newDocker.bounds.centerMoveTo(x, y);

							//this.dockers = this.dockers.without(newDocker);
							//this.dockers.splice(this.dockers.indexOf(dockersByPath.last()), 0, newDocker);
							//dockersByPath.splice(this.dockers.indexOf(dockersByPath.last()), 0, newDocker);
						}
					}
				}
			});
		} else {
			this.alignDockers();
		}
		this._changed();
	},

	toString: function() {
		return this.getStencil().title() + " " + this.id;
	},

	/**
	 * @return {ORYX.Core.Shape} Returns last docked shape or null.
	 */
	getTarget: function() {
		return this.dockers[this.dockers.length - 1] ? this.dockers[this.dockers.length - 1].getDockedShape() : null;
	},

	/**
	 * @return {ORYX.Core.Shape} Returns the first docked shape or null
	 */
	getSource: function() {
		return this.dockers.length && this.dockers[0] ? this.dockers[0].getDockedShape() : null;
	},

	/**
	 * Checks whether the edge is at least docked to one shape.
	 * 
	 * @return {boolean} True if edge is docked
	 */
	isDocked: function() {
		var isDocked = false;
		this.dockers.forEach(function(docker) {
			if (docker.isDocked()) {
				isDocked = true;
				throw $break;
			}
		});
		return isDocked;
	},

	/**
	 * Calls {@link ORYX.Core.AbstractShape#toJSON} and add a some stencil set information.
	 */
	toJSON: function() {
		var json = ORYX.Core.Shape.prototype.toJSON.apply(this, arguments);

		if (this.getTarget()) {
			json.target = {
				resourceId: this.getTarget().resourceId
			};
		}

		return json;
	}
};
ORYX.Core.Edge = ORYX.Core.Shape.extend(ORYX.Core.Edge);