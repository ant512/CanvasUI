/**
 * CanvasUI namespace contains all core functionality.
 */
var CanvasUI = {

	/**
	 * Gadget class is the base class for all UI widgets.
	 * @param x The x co-ordinate of the gadget, relative to its parent.
	 * @param y The y co-ordinate of the gadget, relataive to its parent.
	 * @param width The width of the gadget.
	 * @param height The height of the gadget.
	 */
	Gadget: function(x, y, width, height) {
		this.parent = null;
		this.clicked = false;
		this.focused = false;
		this.dragged = false;
		this.visible = true;
		this.enabled = true;
		this.draggable = true;
		this.backColour = '#eee';
		this.shineColour = '#fff';
		this.shadowColour = '#000';
		this.darkColour = '#555';
		this.highlightColour = '#aaf';
		this.focusedGadget = null;
		
		this.rect = new CanvasUI.Rectangle(x, y, width, height);
		this.children = new CanvasUI.GadgetCollection(this);
		this.borderSize = new CanvasUI.BorderSize(0, 0, 0, 0);

		this.onClick = null;
		this.onRelease = null;
		this.onReleaseOutside = null;
		this.onDrag = null;
		this.onFocus = null;
		this.onBlur = null;
		this.onValueChange = null;
	},
		
	/**
	 * Rectangle class.
	 * @param x The x co-ordinate of the rectangle.
	 * @param y The y co-ordinate of the rectangle.
	 * @param width The width of the rectangle.
	 * @param height The height of the rectangle.
	 */
	Rectangle: function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	},
		
	/**
	 * List of gadgets.
	 * @param gadget The gadget that contains the list.
	 */
	GadgetCollection: function(gadget) {
		this.list = new Array();
		this.gadget = gadget;
	},

	/**
	 * Graphics class for drawing to canvas.
	 * @param x The x co-ordinate of the graphics object's origin relative to
	 * the canvas it will draw to.
	 * @param y The y co-ordinate of the graphics object's origin relative to
	 * the canvas it will draw to.
	 * @param canvas The canvas being drawn to.
	 * @param clipRect The rectangle to clip to.
	 */
	Graphics: function(x, y, canvas, clipRect) {
		this.x = x;
		this.y = y;
		this.clipRect = clipRect;
		this.canvas = canvas;
		this.context = this.canvas == null ? null : this.canvas.getContext("2d");
		this.fontSize = "12px";
		this.fontFamily = "sans-serif";
	},
	
	/**
	 * Size of gadget borders.
	 * @param top The top border size.
	 * @param right The right border size.
	 * @param bottom The bottom border size.
	 * @param left The left border size.
	 */
	BorderSize: function(top, right, bottom, left) {
		this.top = top;
		this.right = right;
		this.bottom = bottom;
		this.left = left;
	},
	
	/**
	 * Manages the list of damaged rectangles.
	 * @param gadget This should always be the top-level gadget.
	 */
	DamagedRectManager: function(gadget) {
		this.gadget = gadget;
		this.damagedRects = new Array();
	},
	 
	
	/**
	 * Top-level gadget that contains the rest of the UI.  An instance of this
	 * should be created in order to create a UI.
	 * @param canvas The canvas on which the GUI will be displayed.
	 */
	Gui: function(canvas) {

		// Call base constructor
		CanvasUI.Gadget.prototype.constructor.call(this, 0, 0, canvas.width, canvas.height);
		
		// Set member values
		this.draggable = false;
		
		this.canvas = canvas;			// Drawing space
		this.topLevelGadget = null;		// Toplevel gadget
		this.clickedGadget = null;		// Currently clicked gadget
		this.focusedGadget = null;		// Currently focused gadget

		this.oldMouseX = -1;			// Last observed mouse position
		this.oldMouseY = -1;			// Last observed mouse position
		
		this.damagedRectManager = new CanvasUI.DamagedRectManager(this);
		
		/**
		 * Called when the canvas is clicked - compensates for canvas offset from
		 * top of document body and dispatches to the UI.
		 * @param e The event arguments.
		 */
		CanvasUI.Gui.prototype.handleClick = function(e) {
			var x = e.clientX - canvas.offsetLeft + window.pageXOffset;
			var y = e.clientY - canvas.offsetTop + window.pageYOffset;
			
			this.click(x, y);
			
			this.oldMouseX = x;
			this.oldMouseY = y;
			
			this.damagedRectManager.redraw();
		}

		/**
		 * Called when the canvas is released - compensates for canvas offset from
		 * top of document body and dispatches to the UI.
		 * @param e The event arguments.
		 */
		CanvasUI.Gui.prototype.handleRelease = function(e) {
			var x = e.clientX - canvas.offsetLeft + window.pageXOffset;
			var y = e.clientY - canvas.offsetTop + window.pageYOffset;

			if (this.clickedGadget != null) {
				this.clickedGadget.release(x, y);
			}
			
			this.oldMouseX = -1;
			this.oldMouseY = -1;
			
			this.damagedRectManager.redraw();
		}

		/**
		 * Called when the mouse moves over the canvas - compensates for canvas
		 * offset from top of document body and dispatches to the UI.
		 * @param e The event arguments.
		 */
		CanvasUI.Gui.prototype.handleDrag = function(e) {
		
			var x = e.clientX - canvas.offsetLeft + window.pageXOffset;
			var y = e.clientY - canvas.offsetTop + window.pageYOffset;
			
			if (this.clickedGadget != null) {
				this.clickedGadget.drag(x, y, x - this.oldMouseX, y - this.oldMouseY);
				
				this.damagedRectManager.redraw();
			}
			
			this.oldMouseX = x;
			this.oldMouseY = y;
		}
		
		// Grab a pointer to the canvas and set up event handlers
		var obj = this;
		this.canvas.addEventListener("mousedown", function(e) { obj.handleClick(e); }, false);
		this.canvas.addEventListener("mouseup", function(e) { obj.handleRelease(e); }, false);
		this.canvas.addEventListener("mouseout", function(e) { obj.handleRelease(e); }, false);
		this.canvas.addEventListener("mousemove", function(e) { obj.handleDrag(e); }, false);
		
		this.timer = null;				// Timer that causes the gui to run
										// essential recurring code
		
		// Start the timer
		this.startTimer();
		
		// Ensure that the damaged rect manager knows to redraw this gadget
		this.damagedRectManager.addDamagedRect(this.rect);
	},
	
	/**
	 * Clickable button that displays text.
	 * @param text The button text.
	 * @param x The x co-ordinate of the gadget, relative to its parent.
	 * @param y The y co-ordinate of the gadget, relataive to its parent.
	 * @param width The width of the gadget.
	 * @param height The height of the gadget.
	 */
	Button: function(text, x, y, width, height) {

		// Call base constructor
		CanvasUI.Gadget.prototype.constructor.call(this, x, y, width, height);
		
		this.text = text;
		this.draggable = false;
		
		this.borderSize.top = 1;
		this.borderSize.right = 1;
		this.borderSize.bottom = 1;
		this.borderSize.left = 1;
	},

	/**
	 * Label that displays text.
	 * @param text The label text.
	 * @param x The x co-ordinate of the gadget, relative to its parent.
	 * @param y The y co-ordinate of the gadget, relataive to its parent.
	 * @param width The width of the gadget.
	 * @param height The height of the gadget.
	 */
	Label: function(text, x, y, width, height) {

		// Call base constructor
		CanvasUI.Gadget.prototype.constructor.call(this, x, y, width, height);
		
		this.text = text;
		this.draggable = false;
		
		this.borderSize.top = 1;
		this.borderSize.right = 1;
		this.borderSize.bottom = 1;
		this.borderSize.left = 1;
	},
	
	/**
	 * Clickable button that closes its containing window.
	 * @param x The x co-ordinate of the gadget, relative to its parent.
	 * @param y The y co-ordinate of the gadget, relataive to its parent.
	 * @param width The width of the gadget.
	 * @param height The height of the gadget.
	 */
	WindowCloseButton: function(x, y, width, height) {

		// Call base constructor
		CanvasUI.Gadget.prototype.constructor.call(this, x, y, width, height);
		
		this.draggable = false;
		this.borderSize.top = 1;
		this.borderSize.right = 1;
		this.borderSize.bottom = 1;
		this.borderSize.left = 1;
	},
	
	/**
	 * Clickable button that moves its containing window to the back.
	 * @param x The x co-ordinate of the gadget, relative to its parent.
	 * @param y The y co-ordinate of the gadget, relataive to its parent.
	 * @param width The width of the gadget.
	 * @param height The height of the gadget.
	 */
	WindowDepthButton: function(x, y, width, height) {

		// Call base constructor
		CanvasUI.Gadget.prototype.constructor.call(this, x, y, width, height);
		
		this.draggable = false;
		this.borderSize.top = 1;
		this.borderSize.right = 1;
		this.borderSize.bottom = 1;
		this.borderSize.left = 1;
	},
	
	/**
	 * Window that can contain child gadgets.
	 * @param title The window title.
	 * @param x The x co-ordinate of the gadget, relative to its parent.
	 * @param y The y co-ordinate of the gadget, relataive to its parent.
	 * @param width The width of the gadget.
	 * @param height The height of the gadget.
	 */
	Window: function(title, x, y, width, height) {

		// Call base constructor
		CanvasUI.Gadget.prototype.constructor.call(this, x, y, width, height);
		
		this.title = title;
		this.borderSize.top = 24;
		this.borderSize.right = 6;
		this.borderSize.bottom = 6;
		this.borderSize.left = 6;
		
		var closeButton = new CanvasUI.WindowCloseButton(0, 0, this.borderSize.top, this.borderSize.top);
		this.children.add(closeButton);
		
		// Define release event for close button
		closeButton.onRelease = function(gadget, x, y) {
			gadget.parent.close();
		}
		
		var depthButton = new CanvasUI.WindowDepthButton(this.rect.width - this.borderSize.top, 0, this.borderSize.top, this.borderSize.top);
		this.children.add(depthButton);
		
		// Define release for depth button
		depthButton.onRelease = function(gadget, x, y) {
			gadget.parent.lowerToBottom();
		}
	},
	
	/**
	 * A list of options that can be selected.
	 * @param x The x co-ordinate of the gadget, relative to its parent.
	 * @param y The y co-ordinate of the gadget, relataive to its parent.
	 * @param width The width of the gadget.
	 * @param height The height of the gadget.
	 */
	ListBox: function(x, y, width, height) {
		CanvasUI.Gadget.prototype.constructor.call(this, x, y, width, height);
		
		this.borderSize.top = 4;
		this.borderSize.right = 4;
		this.borderSize.bottom = 4;
		this.borderSize.left = 4;
		
		this.options = new Array();
		this.selected = false;
		this.viewY = 0;
		this.itemHeight = 16;
	},
	
	/**
	 * A single option for display in a ListBox.
	 * @param text The visible text of the option.
	 * @param value The hidden value of the option.
	 */
	ListBoxOption: function(text, value) {
		this.text = text;
		this.value = value;
		this.selected = false;
	},

	/**
	 * A vertical scrollbar.
	 * @param x The x co-ordinate of the gadget, relative to its parent.
	 * @param y The y co-ordinate of the gadget, relataive to its parent.
	 * @param width The width of the gadget.
	 * @param height The height of the gadget.
	 */
	ScrollbarVertical: function(x, y, width, height) {

		// Call base constructor
		CanvasUI.Gadget.prototype.constructor.call(this, x, y, width, height);
		
		this.draggable = true;
		
		this.borderSize.top = 4;
		this.borderSize.right = 4;
		this.borderSize.bottom = 4;
		this.borderSize.left = 4;

		this.minimumValue = 0;
		this.maximumValue = 0;
		this.pageSize = 0;
		this.value = 0;
	},

	/**
	 * A honrizontal scrollbar.
	 * @param x The x co-ordinate of the gadget, relative to its parent.
	 * @param y The y co-ordinate of the gadget, relataive to its parent.
	 * @param width The width of the gadget.
	 * @param height The height of the gadget.
	 */
	ScrollbarHorizontal: function(x, y, width, height) {

		// Call base constructor
		CanvasUI.Gadget.prototype.constructor.call(this, x, y, width, height);
		
		this.draggable = true;
		
		this.borderSize.top = 4;
		this.borderSize.right = 4;
		this.borderSize.bottom = 4;
		this.borderSize.left = 4;

		this.minimumValue = 0;
		this.maximumValue = 0;
		this.pageSize = 0;
		this.value = 0;
	}
}



/** DamagedRectManager Methods **/

/**
 * Add a damaged rect to the list.  The method automatically clips and splits
 * the rect to ensure that only new regions are added to the list.
 * @param rect The rect to add to the list.
 */
CanvasUI.DamagedRectManager.prototype.addDamagedRect = function(rect) {
	var newRects = new Array();
	var remainingRects = new Array();

	newRects.push(rect);

	// Ensure that the new rect does not overlap any existing rects - we only
	// want to draw each region once
	for (var i = 0; i < this.damagedRects.length; ++i) {
		for (var j = 0; j < newRects.length; ++j) {
		
			var intersection = this.damagedRects[i].splitIntersection(newRects[j], remainingRects);

			if (intersection) {
			
				// Intersection contains the part of the new rect that is already known to be damaged
				// and can be discarded.  remainingRects contains the rects that still need to be examined
				newRects.splice(j, 1);
				j--;

				// Insert non-overlapping rects to the front of the array so that they are not
				// examined again for this particular damaged rect
				for (var k = 0; k < remainingRects.length; ++k) {
				
					newRects.unshift(remainingRects[k]);
					j++;
				}

				remainingRects = new Array();
			}
		}
	}

	// Add any non-overlapping rects into the damaged rect array
	for (var i = 0; i < newRects.length; ++i) {
		this.damagedRects.push(newRects[i]);
	}
}

/**
 * Redraws all damaged rects.
 */
CanvasUI.DamagedRectManager.prototype.redraw = function() {
	this.drawRects(this.gadget, this.damagedRects);
}

/**
 * Redraws the specified list of damaged rects for the specified gadget.  The
 * function will recursively call itself in order to draw the gadget and its
 * children in such a way as to minimise redrawing.  The algorithm looks like
 * this:
 * - Work out which parts of the damagedRects array intersect the current
 *   gadget and remove them from the damagedRects array.
 * - Recursively call the method for each of the gadget's children, sending the
 *   intersecting regions as a new array.
 * - Receive back from children any undrawn areas in the new array.
 * - Redraw all rects in the new array.
 * @param gadget The gadget to redraw.
 * @param damagedRects An array of rectangles that must be redrawn.
 */
CanvasUI.DamagedRectManager.prototype.drawRects = function(gadget, damagedRects) {

	if (!gadget.isVisible()) return;
	if (damagedRects.length == 0) return;

	var gadgetRect = gadget.getRectClippedToHierarchy();
	
	var remainingRects = new Array();
	var subRects = new Array();
	
	// Work out which of the damaged rects collide with the current gadget
	for (var i = 0; i < damagedRects.length; ++i) {
		var damagedRect = damagedRects[i];
		
		// Work out which part of the damaged rect intersects the current gadget
		var intersection = gadgetRect.splitIntersection(damagedRect, remainingRects);
		
		if (intersection) {
			damagedRects.splice(i, 1);
			i--;
			
			// Add the non-intersecting parts of the damaged rect back into the
			// list of undrawn rects
			for (var j = 0; j < remainingRects.length; ++j) {
				damagedRects.unshift(remainingRects[j]);
				i++;
			}
			
			remainingRects = new Array();
			
			// Get children to draw all parts of themselves that intersect the
			// intersection we've found.
			subRects.push(intersection);
			
			for (var j = gadget.children.length() - 1; j >= 0; --j) {
				this.drawRects(gadget.children.at(j), subRects);
				
				// Abort if all rects have been drawn
				if (subRects.length == 0) break;
			}
			
			// Children have drawn themselves; anything left in the subRects
			// array must overlap this gadget
			for (var j = 0; j < subRects.length; ++j) {
				gadget.draw(subRects[j]);
			}
			
			subRects = new Array();
		}
	}
}


/** Rect Methods **/

/**
 * Gets the co-ordinate of the rectangle's right edge.
 * @return The co-ordinate of the rectangle's right edge.
 */
CanvasUI.Rectangle.prototype.getX2 = function() {
	return this.x + this.width - 1;
}

/**
 * Gets the co-ordinate of the rectangle's bottom edge.
 * @return The co-ordinate of the rectangle's bottom edge.
 */
CanvasUI.Rectangle.prototype.getY2 = function() {
	return this.y + this.height - 1;
}

/**
 * Gets the intersect of this rectangle with the supplied argument.
 * @param rect The rectangle to intersect with this.
 * @return A rectangle that represents the intersection of the two rectangles.
 */
CanvasUI.Rectangle.prototype.getIntersect = function(rect) {
	var x1 = this.x > rect.x ? this.x : rect.x;
	var y1 = this.y > rect.y ? this.y : rect.y;

	var x2 = this.getX2() < rect.getX2() ? this.getX2() : rect.getX2();
	var y2 = this.getY2() < rect.getY2() ? this.getY2() : rect.getY2();

	return new CanvasUI.Rectangle(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
}

/**
 * Gets the smallest rectangle capable of containing this rect and the supplied
 * argument.
 * @param rect The rectangle to add to this.
 * @return The smallest rectangle that can contain this rect and the argument.
 */
CanvasUI.Rectangle.prototype.getAddition = function(rect) {
	var x1 = x < rect.x ? this.x : rect.x;
	var y1 = y < rect.y ? this.y : rect.x;

	var x2 = this.getX2() > rect.getX2() ? this.getX2() : rect.getX2();
	var y2 = this.getY2() > rect.getY2() ? this.getY2() : rect.getY2();

	return new CanvasUI.Rectangle(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
}

/**
 * Clips this rectangle to the intersection with the supplied argument.
 * @param rect The rectangle to clip to.
 */
CanvasUI.Rectangle.prototype.clipToIntersect = function(rect) {
	var clipped = this.getIntersect(rect);

	this.x = clipped.x;
	this.y = clipped.y;
	this.width = clipped.width;
	this.height = clipped.height;
}

/**
 * Increases the size of the rect to encompass the supplied argument.
 * @param rect The rect to encompass.
 */
CanvasUI.Rectangle.prototype.expandToInclude = function(rect) {
	var addition = getAddition(rect);

	this.x = addition.x;
	this.y = addition.y;
	this.width = addition.width;
	this.height = addition.height;
}

/**
 * Check if the rectangle has valid dimensions.
 * @return True if the rectangle has valid dimensions.
 */
CanvasUI.Rectangle.prototype.hasDimensions = function() {
	if (this.width < 1) return false;
	if (this.height < 1) return false;
	return true;
}

/**
 * Check if this rectangle intersects the argument.
 * @param rect The rect to check for an intersection.
 * @return True if the rects intersect.
 */
CanvasUI.Rectangle.prototype.intersects = function(rect) {
	return ((this.x + this.width > rect.x) &&
			(this.y + this.height > rect.y) &&
			(this.x < rect.x + rect.width) &&
			(this.y < rect.y + rect.height));
}

/**
 * Check if this rectangle contains the argument co-ordinate.
 * @param x The x co-ordinate to check.
 * @param y The y co-ordinate to check.
 * @return True if this rect contains the argument co-ordinate.
 */
CanvasUI.Rectangle.prototype.contains = function(x, y) {
	return ((x >= this.x) &&
			(y >= this.y) &&
			(x < this.x + this.width) &&
			(y < this.y + this.height));
}

/**
 * Splits the rect argument into the area that overlaps this rect (this is
 * the return value) and an array of areas that do not overlap (this is the
 * remainderRects argument, which must be passed as an empty array).
 * @param rect The rectangle to intersect with this.
 * @param remainderRects An empty array that will be populated with the areas
 * of the rect parameter that do not intersect with this rect.
 * @return The intersection of this rectangle and the rect argument.
 */
CanvasUI.Rectangle.prototype.splitIntersection = function(rect, remainderRects) {

	if (!this.intersects(rect)) return null;
	
	// Copy the properties of rect into intersection; we trim this to size later
	var intersection = new CanvasUI.Rectangle(rect.x, rect.y, rect.width, rect.height);

	// Check for a non-overlapped rect on the left
	if (intersection.x < this.x) {
		var left = new CanvasUI.Rectangle(0, 0, 0, 0);
		left.x = intersection.x;
		left.y = intersection.y;
		left.width = this.x - intersection.x;
		left.height = intersection.height;
		
		// Insert the rect
		remainderRects.push(left);
		
		// Adjust the dimensions of the intersection
		intersection.x = this.x;
		intersection.width -= left.width;
	}
	
	// Check for a non-overlapped rect on the right
	if (intersection.x + intersection.width > this.x + this.width) {
		var right = new CanvasUI.Rectangle(0, 0, 0, 0);
		right.x = this.x + this.width;
		right.y = intersection.y;
		right.width = intersection.width - (this.x + this.width - intersection.x);
		right.height = intersection.height;
		
		// Insert the rect
		remainderRects.push(right);
		
		// Adjust dimensions of the intersection
		intersection.width -= right.width;
	}
	
	// Check for a non-overlapped rect above
	if (intersection.y < this.y) {
		var top = new CanvasUI.Rectangle(0, 0, 0, 0);
		top.x = intersection.x;
		top.y = intersection.y;
		top.width = intersection.width;
		top.height = this.y - intersection.y;
		
		// Insert the rect
		remainderRects.push(top);
		
		// Adjust the dimensions of the intersection
		intersection.y = this.y;
		intersection.height -= top.height;
	}
	
	// Check for a non-overlapped rect below
	if (intersection.y + intersection.height > this.y + this.height) {
		var bottom = new CanvasUI.Rectangle(0, 0, 0, 0);
		bottom.x = intersection.x;
		bottom.y = this.y + this.height;
		bottom.width = intersection.width;
		bottom.height = intersection.height - (this.y + this.height - intersection.y);
		
		// Insert the rect
		remainderRects.push(bottom);
		
		// Adjust dimensions of the intersection
		intersection.height -= bottom.height;
	}
	
	return intersection;
}



/** Graphics Methods **/

/**
 * Draws a bevelled rectangle.
 * @param rect The rectangle to draw.
 * @param lightColour The colour to use for the light edges.
 * @param darkColour The colour to use for the dark edges.
 */
CanvasUI.Graphics.prototype.drawBevelledRect = function(rect, lightColour, darkColour) {
	if (this.context == null) return;
	
	this.fillRect(new CanvasUI.Rectangle(rect.x, rect.y, rect.width, 1), lightColour);
	this.fillRect(new CanvasUI.Rectangle(rect.x, rect.y, 1, rect.height), lightColour);
	this.fillRect(new CanvasUI.Rectangle(rect.x + rect.width - 1, rect.y, 1, rect.height), darkColour);
	this.fillRect(new CanvasUI.Rectangle(rect.x, rect.y + rect.height - 1, rect.width, 1), darkColour);
}

/**
 * Draws a rectangle.
 * @param rect The rectangle to draw.
 * @param colour The colour to draw with.
 */
CanvasUI.Graphics.prototype.drawRect = function(rect, colour) {
	if (this.context == null) return;

	this.fillRect(new CanvasUI.Rectangle(rect.x, rect.y, rect.width, 1), colour);
	this.fillRect(new CanvasUI.Rectangle(rect.x, rect.y, 1, rect.height), colour);
	this.fillRect(new CanvasUI.Rectangle(rect.x + rect.width - 1, rect.y, 1, rect.height), colour);
	this.fillRect(new CanvasUI.Rectangle(rect.x, rect.y + rect.height - 1, rect.width, 1), colour);
}

/**
 * Draws filled text.
 * @param text The text to render.
 * @param x The x co-ordinate of the text.
 * @param y The y co-ordinate of the text.
 * @param colour The colour to draw with.
 */
CanvasUI.Graphics.prototype.fillText = function(text, x, y, colour) {
	if (this.context == null) return;
	
	// Compensate for graphics offset
	x += this.x;
	y += this.y;

	this.context.save();
	this.context.beginPath();
	this.context.rect(this.clipRect.x, this.clipRect.y, this.clipRect.width, this.clipRect.height);
	this.context.clip();

	this.context.fillStyle = colour;
	this.context.font = this.fontSize + ' ' + this.fontFamily;
	this.context.fillText(text, x, y);
	this.context.closePath();
	this.context.restore();
}

/**
 * Gets the width in pixels of the specified text using the current font and
 * font size.
 * @param text The text to measure.
 * @return The width of the string in pixels.
 */
CanvasUI.Graphics.prototype.getTextWidth = function(text) {
	if (this.context == null) return 0;
	
	this.context.save();
	this.context.font = this.fontSize + ' ' + this.fontFamily;
	var width = this.context.measureText(text).width
	this.context.restore();
	
	return width;
}

/**
 * Draws a filled rectangle.
 * @param rect The rectangle to draw.
 * @param colour The colour to draw with.
 */
CanvasUI.Graphics.prototype.fillRect = function(rect, colour) {
	if (this.context == null) return;
	
	// Compensate for graphics offset
	var x = rect.x + this.x;
	var y = rect.y + this.y;

	this.context.save();
	this.context.beginPath();
	this.context.rect(this.clipRect.x, this.clipRect.y, this.clipRect.width, this.clipRect.height);
	this.context.clip();
	
	this.context.fillStyle = colour;
	this.context.fillRect(x, y, rect.width, rect.height);
	this.context.closePath();
	this.context.restore();
}

/**
 * Draws a rectangle filled with a linear gradient.
 * @param rect The rectangle to draw.
 * @param gradientX1 The x co-ordinate of the start of the gradient.
 * @param gradientY1 The y co-ordinate of the start of the gradient.
 * @param gradientX2 The x co-ordinate of the end of the gradient.
 * @param gradientY2 The y co-ordinate of the end of the gradient.
 * @param colourStops An array of anonymous objects containing colour stop
 * data.  A black to white gradient would be defined as:
 * [{ offset: 0, colour: '#000' }, { offset: 1, colour: '#fff' }]
 * The offset property of the objects is a fractional value between 0 and 1
 * inclusive, where 0 is the start of the gradient, 1 is the end of the
 * gradient, and 0.5 is half-way between the two.
 */
CanvasUI.Graphics.prototype.fillGradientRect = function(rect, gradientX1, gradientY1, gradientX2, gradientY2, colourStops) {
	if (this.context == null) return;
	
	// Compensate for graphics offset
	var x = rect.x + this.x;
	var y = rect.y + this.y;

	gradientX1 += this.x;
	gradientY1 += this.y;
	gradientX2 += this.x;
	gradientY2 += this.y;

	this.context.save();
	this.context.beginPath();
	this.context.rect(this.clipRect.x, this.clipRect.y, this.clipRect.width, this.clipRect.height);
	this.context.clip();

	var gradient = this.context.createLinearGradient(gradientX1, gradientY1, gradientX2, gradientY2);
	for (var i in colourStops) {
		gradient.addColorStop(colourStops[i].offset, colourStops[i].colour);
	}
	
	this.context.fillStyle = gradient;
	this.context.fillRect(x, y, rect.width, rect.height);
	this.context.closePath();
	this.context.restore();
}


/** GadgetCollection Methods **/

/**
 * Add a gadget to the end of the collection.
 * @param gadget The gadget to add to the collection.
 */
CanvasUI.GadgetCollection.prototype.add = function(gadget) {
	gadget.parent = this.gadget;
	this.list.push(gadget);
	
	gadget.markRectsDamaged();
}

/**
 * Insert a gadget at the start of the collection.
 * @param gadget The gadget to insert into the collection.
 */
CanvasUI.GadgetCollection.prototype.insert = function(gadget) {
	gadget.parent = this.gadget;
	this.list.splice(0, 0, gadget);

	gadget.markRectsDamaged();	
}

/**
 * Remove a gadget from the collection.
 * @param gadget The gadget to remove from the collection.
 */
CanvasUI.GadgetCollection.prototype.remove = function(gadget) {
	var index = this.getGadgetIndex(gadget);
	if (index > -1) {
		this.list.splice(index, 1);
	}
	
	gadget.markRectsDamaged();
	
	gadget.parent = null;
}

/**
 * Get the number of gadgets in the collection.
 * @return The number of gadgets in the collection.
 */
CanvasUI.GadgetCollection.prototype.length = function() { return this.list.length; }
		
/**
 * Get the gadget at the specified index.
 * @return The gadget at the specified index.
 */
CanvasUI.GadgetCollection.prototype.at = function(index) { return this.list[index]; }
		

/**
 * Raise the specified gadget to the top (ie. end) of the collection.
 * @param gadget The gadget to raise to the top of the collection.
 */
CanvasUI.GadgetCollection.prototype.raiseToTop = function(gadget) {		
	var index = this.getGadgetIndex(gadget);
	if (index > -1) {
		this.list.splice(index, 1);
		this.add(gadget);
	}
}

/**
 * Lower the specified gadget to the bottom (ie. start) of the collection.
 * @param gadget The gadget to lower to the bottom of the collection.
 */
CanvasUI.GadgetCollection.prototype.lowerToBottom = function(gadget) {
	var index = this.getGadgetIndex(gadget);
	if (index > -1) {
		this.list.splice(index, 1);
		this.insert(gadget)
	}
}
		
/**
 * Locate gadget in list.
 * @param gadget The gadget to find.
 * @return The index of the gadget, or -1 if the gadget is not found.
 */
CanvasUI.GadgetCollection.prototype.getGadgetIndex = function(gadget) {
	for (var i in this.list) {
		if (this.list[i] == gadget) {
			return i;
		}
	}
	
	return -1;
}


/** Gadget Methods **/

/**
 * Gets the x co-ordinate of the gadget relative to the top-level gadget.
 * @return The x co-ordinate of the gadget relative to the top-level gadget.
 */
CanvasUI.Gadget.prototype.getX = function() {
	if (this.parent != null) {
		return this.rect.x + this.parent.getX();
	}
	
	return this.rect.x;
}

/**
 * Gets the y co-ordnate of the gadget relative to the top-level gadget.
 * @return The y co-ordinate of the gadget relative to the top-level gadget.
 */
CanvasUI.Gadget.prototype.getY = function() {
	if (this.parent != null) {
		return this.rect.y + this.parent.getY();
	}
	
	return this.rect.y;
}

/**
 * Gets the width of the gadget.
 * @return The width of the gadget.
 */
CanvasUI.Gadget.prototype.getWidth = function() { return this.rect.width; }

/**
 * Gets the height of the gadget.
 * @return The height of the gadget.
 */
CanvasUI.Gadget.prototype.getHeight = function() { return this.rect.height; }

/**
 * Gets a rectangle describing the available client space within the gadget
 * (which is defined as the gadget's rectangle minus its border).
 * @return A rectangle describing the client space within the gadget.
 */
CanvasUI.Gadget.prototype.getClientRect = function() {
	var x = this.borderSize.left;
	var y = this.borderSize.top;
	var width = this.getWidth() - this.borderSize.right - this.borderSize.left;
	var height = this.getHeight() - this.borderSize.bottom - this.borderSize.top;
	
	return new CanvasUI.Rectangle(x, y, width, height);
}

/**
 * Gets the gadget's rectangle, clipped to the rectangles of its ancestor
 * gadgets.  This is useful if a gadget has been moved partially or totally
 * out of the space available within its parent and only the visible portion
 * should be used (ie. in clipped drawing functions).
 * @return The gadget's rectangle clipped to its ancestors.
 */
CanvasUI.Gadget.prototype.getRectClippedToHierarchy = function() {

	var rect = new CanvasUI.Rectangle(this.getX(), this.getY(), this.getWidth(), this.getHeight());

	var parent = this.parent;
	var gadget = this;

	while (parent) {

		// Copy parent's properties into the rect
		var parentRect = parent.rect;

		rect.clipToIntersect(parentRect);

		// Send up to parent
		gadget = parent;
		parent = parent.parent;
	}
	
	return rect;
}

/**
 * Check if the gadget is visible or not.  A gadget is not visible if its parent
 * is not visible.
 * @return True if the gadget and its parents are visible.
 */
CanvasUI.Gadget.prototype.isVisible = function() {
	if (!this.visible) return false;
	if (!this.parent) return this.visible;
	return (this.parent.isVisible());
}

/**
 * Check if the gadget is enabled or not.  A gadget is not enabled if its parent
 * is not enabled.
 * @return True if the gadget and its parents are enabled.
 */
CanvasUI.Gadget.prototype.isEnabled = function() {
	if (!this.enabled) return false;
	if (!this.parent) return this.enabled;
	return (this.parent.isEnabled());
}

/**
 * Gets the gadget's canvas.  Recurses up the gadget tree until the top-level
 * gadget is found, which should return its reference to the current canvas.
 * @return The gadget's canvas.
 */
CanvasUI.Gadget.prototype.getCanvas = function() {
	if (this.parent) return this.parent.getCanvas();
	return null;
}

/**
 * Gets the gadget's damaged rectangle manager.  Recurses up the gadget tree
 * until the top-level gadget is found, which should return its reference to the
 * current damaged rectangle manager.
 * @return The gadget's damaged rectangle manager.
 */
CanvasUI.Gadget.prototype.getDamagedRectManager = function() {
	if (this.parent) return this.parent.getDamagedRectManager();
	return null;
}

/**
 * Sends the visible portions of the gadget as damaged to the damaged rectangle
 * manager for redraw.  Should be called whenever the visible state of the
 * gadget should change.
 */
CanvasUI.Gadget.prototype.markRectsDamaged = function() {
	var damagedRects = this.getVisibleRects();
	
	var damagedRectManager = this.getDamagedRectManager();

	if (!damagedRectManager) return;
	
	for (var i in damagedRects) {
		damagedRectManager.addDamagedRect(damagedRects[i]);
	}
}

/**
 * Gets a list of the gadget's visible rectangles.  These are the portions of
 * the gadget not overlapped by other gadgets.  If the gadget is totally
 * obscured an empty array is returned.
 * @return An array of all visible regions of the gadget.
 */
CanvasUI.Gadget.prototype.getVisibleRects = function() {

	var rect = new CanvasUI.Rectangle(this.getX(), this.getY(), this.getWidth(), this.getHeight());

	var visibleRects = new Array();
	visibleRects.push(rect);
	
	var gadget = this;
	var parent = this.parent;

	while (parent && gadget) {

		// Locate gadget in the list; we add one to the index to
		// ensure that we deal with the next gadget up in the z-order
		var gadgetIndex = parseInt(parent.children.getGadgetIndex(gadget)) + 1;

		// Gadget should never be the bottom item on the screen
		if (gadgetIndex > 0) {

			// Remove any overlapped rectangles
			for (var i = gadgetIndex; i < parent.children.length(); i++) {
				for (var j = 0; j < visibleRects.length; ++j) {
					var remainingRects = new Array();
					
					var child = parent.children.at(i);
					var childRect = new CanvasUI.Rectangle(child.getX(), child.getY(), child.getWidth(), child.getHeight());
					
					if (childRect.splitIntersection(visibleRects[j], remainingRects)) {
						visibleRects.splice(j, 1);
						j--;
						
						for (var k in remainingRects) {
							visibleRects.unshift(remainingRects[k]);
							j++;
						}
					}
				}
				
				// Stop processing if there are no more visible rects
				if (visibleRects.length == 0) break;
			}
		}

		if (visibleRects.length > 0) {
			gadget = parent;

			if (parent) {
				parent = parent.parent;
			}
		} else {
			return visibleRects;
		}
	}
	
	return visibleRects;
}

/**
 * Sets the clicked gadget.
 * @param gadget The new clicked gadget.
 */
CanvasUI.Gadget.prototype.setClickedGadget = function(gadget) {
	if (this.parent != null) this.parent.setClickedGadget(gadget);
}

/**
 * Gets the clicked gadget.
 * @return The clicked gadget.
 */
CanvasUI.Gadget.prototype.getClickedGadget = function() {
	if (this.parent != null) return this.parent.getClickedGadget();
	return null;
}

/**
 * Closes the gadget.
 */
CanvasUI.Gadget.prototype.close = function() {
	if (this.parent != null) {
		this.parent.children.remove(this);
	}
}

/**
 * Draws the region of the gadget contained within the supplied rectangle.
 * @param rect The region to draw.
 */
CanvasUI.Gadget.prototype.draw = function(rect) {
	if (!this.isVisible()) return;
	
	var gfx = new CanvasUI.Graphics(this.getX(), this.getY(), this.getCanvas(), rect);

	this.drawBackground(gfx);
	this.drawBorder(gfx);
	
	/*
	// Enable this to draw rects around all clipping regions
	gfx.context.save();
	gfx.context.beginPath();
	gfx.context.rect(0, 0, gfx.canvas.width, gfx.canvas.height);
	gfx.context.clip();
	
	gfx.context.strokeStyle = '#f00';
	gfx.context.strokeRect(rect.x, rect.y, rect.width, rect.height);
	gfx.context.closePath();
	gfx.context.restore();
	*/
}

/**
 * Draws the background.  This can be overridden in user-created gadgets so that
 * gadgets can contain custom visual content.
 * @param gfx A Graphics object to draw with.
 */
CanvasUI.Gadget.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	gfx.fillRect(drawRect, this.backColour);
}

/**
 * Draws the border.  This can be overridden in user-created gadgets so that
 * gadgets can contain custom borders.
 * @param gfx A Graphics object to draw with.
 */
CanvasUI.Gadget.prototype.drawBorder = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	if (this.clicked) {
		gfx.drawBevelledRect(drawRect, this.shadowColour, this.shineColour);
	} else {
		gfx.drawBevelledRect(drawRect, this.shineColour, this.shadowColour);
	}
}

/**
 * Check if this gadget collides with the supplied rectangle.
 * @param rect The rectangle to check for collisions.
 * @return True if a collision has occurred.
 */
CanvasUI.Gadget.prototype.checkRectCollision = function(rect) {
	if (!this.isVisible()) return false;

	var x = this.getX();
	var y = this.getY();
	
	if (rect.x + rect.width <= x) return false;
	if (rect.x >= x + this.rect.width) return false;
	if (rect.y + rect.height <= y) return false;
	if (rect.y >= y + this.rect.height) return false;
	
	return true;
}

/**
 * Check if the supplied co-ordinates fall within this gadget.
 * @param x The x co-ordinate of the point.
 * @param y The y co-ordinate of the point.
 * @return True if the point falls within this gadget.
 */
CanvasUI.Gadget.prototype.checkPointCollision = function(x, y) {
	if (!this.isVisible()) return false;

	var thisX = this.getX();
	var thisY = this.getY();
	
	if (x < thisX) return false;
	if (x >= thisX + this.rect.width) return false;
	if (y < thisY) return false;
	if (y >= thisY + this.rect.height) return false;
	
	return true;
}

/**
 * Set the focused gadget to the supplied gadget.
 * @param gadget The gadget to give focus to.
 */
CanvasUI.Gadget.prototype.setFocusedGadget = function(gadget) {
	if (this.focusedGadget != gadget) {
		if (this.focusedGadget != null) {
			this.focusedGadget.blur();
		}
	}
	
	this.focusedGadget = gadget;
	
	this.focus();
}

/**
 * Give the current gadget focus.
 */
CanvasUI.Gadget.prototype.focus = function() {
	var hadFocus = this.focused;
	this.focused = true;
	
	if (this.parent != null) {
		this.parent.setFocusedGadget(this);
	}
	
	this.markRectsDamaged();
	
	if (!hadFocus) {
		if (this.onFocus != null) this.onFocus(this);
		return true;
	}
	
	return false;
}

/**
 * Remove focus from the current gadget.
 */
CanvasUI.Gadget.prototype.blur = function() {
	var hadFocus = this.focused;
	this.focused = false;
	
	if (this.focusedGdget != null) {
		this.focusedGadget.blur();
		this.focusedGadget = null;
	}
	
	this.markRectsDamaged();
	
	if (hadFocus) {
		if (this.onBlur != null) this.onBlur(this);
		return true;
	}
	
	return false;
}

/**
 * Click the gadget at the specified co-ordinates.
 * @param x The x co-ordinate of the click.
 * @param y The y co-ordinate of the click.
 * @return True if the gadget received the click; false if not.  Clicks are only
 * received by visible gadgets if the click falls within them.  Clicks are
 * received by disabled gadgets but they are not processed.
 */
CanvasUI.Gadget.prototype.click = function(x, y) {

	if (!this.isVisible()) return false;

	// Exit if click falls outside boundarues
	if (!this.checkPointCollision(x, y)) return false;
	
	// Check for collision with children
	for (var i = this.children.length() - 1; i >= 0; --i) {
		if (this.children.at(i).click(x, y)) {
			return true;
		}
	}
	
	// Stop processing if the gadget is disabled
	if (!this.isEnabled()) return true;
	
	// This gadget has been clicked
	this.clicked = true;
	this.setClickedGadget(this);
	
	this.setFocusedGadget(null);
	
	var rect = this.getClientRect();

	this.processClick(x - this.getX() - rect.x, y - this.getY() - rect.y);
	
	this.markRectsDamaged();
	
	if (this.onClick != null) this.onClick(this, x - this.getX() - rect.x, y - this.getY() - rect.y);
	
	return true;
}

/**
 * Called when a click is received.  Should be overridden in subclasses to allow
 * custom click behaviour.
 * @param x The x co-ordinate of the click.
 * @param y The y co-ordinate of the click.
 */
CanvasUI.Gadget.prototype.processClick = function(x, y) { }

/**
 * Release the gadget at the specified co-ordinates.
 * @param x The x co-ordinate of the release.
 * @param y The y co-ordinate of the release.
 * @return True if the gadget received the release; false if not.  Releases are
 * only received if the gadget is clicked.  If the click is received, the
 * gadget will fire a ReleaseEvent if the click falls within the bounds of the
 * gadget or a ReleaseOutsideEvent if the click falls outside the gadget.
 */
CanvasUI.Gadget.prototype.release = function(x, y) {

	if (this.clicked) {
		this.clicked = false;
		this.dragged = false;
		
		if (this.getClickedGadget() == this) this.setClickedGadget(null);
		
		this.markRectsDamaged();

		var rect = this.getClientRect();
		
		// Released within the gadget or outside?
		if (this.checkPointCollision(x, y)) {
			if (this.onRelease != null) this.onRelease(this, x - this.getX() - rect.x, y - this.getY() - rect.y);
		} else {
			if (this.onReleaseOutside != null) this.onReleaseOutside(this, x - this.getX() - rect.y, y - this.getY() - rect.y);
		}
		
		return true;
	}

	return false;
}

/**
 * Called when the gadget is dragged.  Should be overridden in subclasses to
 * allow custom drag behaviour.
 * @param x The x co-ordinate of the drag.
 * @param y The y co-ordinate of the drag.
 * @param dx The x distance moved.
 * @param dy The y distance moved.
 */
CanvasUI.Gadget.prototype.processDrag = function(x, y, dx, dy) { }

/**
 * Drag the gadget.
 * @param x The x co-ordinate of the drag.
 * @param y The y co-ordinate of the drag.
 * @param dx The x distance moved.
 * @param dy The y distance moved.
 */
CanvasUI.Gadget.prototype.drag = function(x, y, dx, dy) {
	
	if (this.dragged) {

		var rect = this.getClientRect();

		this.processDrag(x - this.getX() - rect.x, y - this.getY() - rect.y, dx, dy);
		
		if (this.onDrag != null) this.onDrag(this, x - this.getX() - rect.x, y - this.getY() - rect.y, dx, dy);
			
		return true;
	}
	
	return false;
}

/**
 * Gets the minimum x co-ordinate available to a child gadget.
 * @return The minimum x co-ordinte available to a child gadget.
 */
CanvasUI.Gadget.prototype.getMinChildX = function() {
	return this.borderSize.left;
}

/**
 * Gets the minimum y co-ordinate available to a child gadget.
 * @return The minimum y co-ordinte available to a child gadget.
 */
CanvasUI.Gadget.prototype.getMinChildY = function() {
	return this.borderSize.top;
}

/**
 * Gets the maximum x co-ordinate available to a child gadget.
 * @return The maximum x co-ordinte available to a child gadget.
 */
CanvasUI.Gadget.prototype.getMaxChildX = function() {
	return this.rect.width - this.borderSize.right - 1;
}

/**
 * Gets the maximum y co-ordinate available to a child gadget.
 * @return The maximum y co-ordinte available to a child gadget.
 */
CanvasUI.Gadget.prototype.getMaxChildY = function() {
	return this.rect.height - this.borderSize.bottom - 1;
}

/**
 * Moves the gadget to the specified co-ordinates.
 * @param x The new x co-ordinate of the gadget, relative to its parent.
 * @param y The new y co-ordinate of the gadget, relative to its parent.
 */
CanvasUI.Gadget.prototype.moveTo = function(x, y) {

	this.hide();

	// Prevent moving outside parent
	if (this.parent != null) {
		var minX = this.parent.getMinChildX();
		var maxX = this.parent.getMaxChildX() - this.rect.width + 1;
		var minY = this.parent.getMinChildY();
		var maxY = this.parent.getMaxChildY() - this.rect.height + 1;
		
		if (x < minX) x = minX;
		if (x > maxX) x = maxX;
		if (y < minY) y = minY;
		if (y > maxY) y = maxY;
	}
	
	this.rect.x = x;
	this.rect.y = y;
		
	this.show();
}

/**
 * Hides the gadget if it is visible.
 */
CanvasUI.Gadget.prototype.hide = function() {
	if (this.visible) {
		this.visible = false;

		this.markRectsDamaged();
	}
}

/**
 * Shows the gadget if it is hidden.
 */
CanvasUI.Gadget.prototype.show = function() {
	if (!this.visible) {
		this.visible = true;
		
		this.markRectsDamaged();
	}
}

/**
 * Raises the gadget to the top of its parent's stack.
 */
CanvasUI.Gadget.prototype.raiseToTop = function() {
	if (this.parent != null) {
		this.hide();
		this.parent.raiseChildToTop(this);
		this.show();
	}
}

/**
 * Raises the child to the top of the child stack.
 * @param child The child to raise to the top of the stack.
 */
CanvasUI.Gadget.prototype.raiseChildToTop = function(child) {
	this.children.raiseToTop(child);
}

/**
 * Lowers the gadget to the bottom of its parent's stack.
 */
CanvasUI.Gadget.prototype.lowerToBottom = function() {
	if (this.parent != null) {
		this.hide();
		this.parent.lowerChildToBottom(this);
		this.show();
	}
}

/**
 * Lowers the child to the bottom of the child stack.
 * @param child The child to lower to the bottom of the stack.
 */
CanvasUI.Gadget.prototype.lowerChildToBottom = function(child) {
	this.children.lowerToBottom(child);
}


/** Gui Methods **/

CanvasUI.Gui.prototype = new CanvasUI.Gadget;

CanvasUI.Gui.prototype.constructor = CanvasUI.Gui;

/**
 * Overrides the base method with an empty method to ensure that no border is
 * drawn.
 */
CanvasUI.Gui.prototype.drawBorder = function(gfx) { }

/**
 * Gets the gadget's canvas.
 * @return The gadget's canvas.
 */
CanvasUI.Gui.prototype.getCanvas = function() { return this.canvas; }

/**
 * Sets the clicked gadget.
 * @param gadget The clicked gadget.
 */
CanvasUI.Gui.prototype.setClickedGadget = function(gadget) {
	this.clickedGadget = gadget;
}

/**
 * Gets the clicked gadget.
 * @return The clicked gadget.
 */
CanvasUI.Gui.prototype.getClickedGadget = function() { return this.clickedGadget; }

/**
 * Gets the damaged rectangle manager.
 * @return The damaged rectangle manager.
 */
CanvasUI.Gui.prototype.getDamagedRectManager = function() {
	return this.damagedRectManager;
}

/**
 * Sets up a timer that ensures that the gui redraws any changes that
 * occur outside of click/release/drag events.
 */
CanvasUI.Gui.prototype.startTimer = function() {
	var obj = this;
	this.timer = setTimeout(function() { obj.damagedRectManager.redraw(), 10 });
}


/** Label Methods **/

CanvasUI.Label.prototype = new CanvasUI.Gadget;

CanvasUI.Label.prototype.constructor = CanvasUI.Label;

/**
 * Draws the gadget.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.Label.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	var textX = (this.rect.width - gfx.getTextWidth(this.text)) / 2;
	var textY = this.rect.height - (parseInt(gfx.fontSize) / 2);
	
	var colour1 = '#eee';
	var colour2 = '#ddd';
	var colour3 = '#ccc';
	
	// Draw top
	gfx.fillGradientRect(drawRect, 0, 0, 0, drawRect.height,
		[
			{ offset: 0, colour: colour1 },
			{ offset: 0.1, colour: colour2 },
			{ offset: 1, colour: colour3 }
		]
	);

	if (this.isEnabled()) {
		gfx.fillText(this.text, textX, textY, this.shadowColour);
	} else {
		gfx.fillText(this.text, textX + 1, textY + 1, this.shadowColour);
		gfx.fillText(this.text, textX, textY, this.shineColour);
	}
}

/**
 * Draws the gadget's border.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.Label.prototype.drawBorder = function(gfx) { }


/** Button Methods **/

CanvasUI.Button.prototype = new CanvasUI.Gadget;

CanvasUI.Button.prototype.constructor = CanvasUI.Button;

/**
 * Draws the gadget.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.Button.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	var textX = (this.rect.width - gfx.getTextWidth(this.text)) / 2;
	var textY = this.rect.height - (parseInt(gfx.fontSize) / 2);
	
	if (this.clicked) {
		gfx.fillRect(drawRect, this.darkColour);
		gfx.fillText(this.text, textX, textY, this.shineColour);
	} else {

		var colour1 = '#eee';
		var colour2 = '#ddd';
		var colour3 = '#ccc';
		
		// Draw top
		gfx.fillGradientRect(drawRect, 0, 0, 0, drawRect.height,
			[
				{ offset: 0, colour: colour1 },
				{ offset: 0.1, colour: colour2 },
				{ offset: 1, colour: colour3 }
			]
		);

		if (this.isEnabled()) {
			gfx.fillText(this.text, textX, textY, this.shadowColour);
		} else {
			gfx.fillText(this.text, textX + 1, textY + 1, this.shadowColour);
			gfx.fillText(this.text, textX, textY, this.shineColour);
		}
	}
}

/**
 * Draws the gadget's border.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.Button.prototype.drawBorder = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	if (this.clicked) {
		gfx.drawBevelledRect(drawRect, this.shadowColour, this.shineColour);
	} else {
		gfx.drawBevelledRect(drawRect, this.shineColour, this.shadowColour);
	}
}


/** WindowCloseButton Methods **/

CanvasUI.WindowCloseButton.prototype = new CanvasUI.Gadget;

CanvasUI.WindowCloseButton.prototype.constructor = CanvasUI.WindowCloseButton;

/**
 * Draws the gadget.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.WindowCloseButton.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	// Choose colour based on focus
	var colour1 = this.parent.focused ? '#ddf' : '#eef';
	var colour2 = this.parent.focused ? '#99f' : '#bbf';
	var colour3 = this.parent.focused ? '#88f' : '#aaf';
	
	// Draw top
	gfx.fillGradientRect(drawRect, 0, 0, 0, drawRect.height,
		[
			{ offset: 0, colour: colour1 },
			{ offset: 0.2, colour: colour2 },
			{ offset: 1, colour: colour3 }
		]
	);
	
	var quarterWidth = (this.rect.height / 4);
	var quarterHeight = (this.rect.height / 4);
	var glyphWidth = (this.rect.width / 2);
	var glyphHeight = (this.rect.height / 2);
	gfx.drawRect(new CanvasUI.Rectangle(quarterWidth, quarterHeight, glyphWidth, glyphHeight), this.shadowColour);
}

/**
 * Draws the gadget's border.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.WindowCloseButton.prototype.drawBorder = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	if (this.clicked) {
		gfx.drawBevelledRect(drawRect, this.shadowColour, this.shineColour);
	} else {
		gfx.drawBevelledRect(drawRect, this.shineColour, this.shadowColour);
	}
}


/** WindowDepthButton Methods **/

CanvasUI.WindowDepthButton.prototype = new CanvasUI.Gadget;

CanvasUI.WindowDepthButton.prototype.constructor = CanvasUI.WindowDepthButton;

/**
 * Draws the gadget.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.WindowDepthButton.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	// Choose colour based on focus
	var colour1 = this.parent.focused ? '#ddf' : '#eef';
	var colour2 = this.parent.focused ? '#99f' : '#bbf';
	var colour3 = this.parent.focused ? '#88f' : '#aaf';
	
	// Draw top
	gfx.fillGradientRect(drawRect, 0, 0, 0, drawRect.height,
		[
			{ offset: 0, colour: colour1 },
			{ offset: 0.2, colour: colour2 },
			{ offset: 1, colour: colour3 }
		]
	);

	var quarterWidth = (this.rect.height / 4);
	var quarterHeight = (this.rect.height / 4);
	var glyphWidth = (this.rect.width / 3);
	var glyphHeight = (this.rect.height / 3);
	gfx.drawRect(new CanvasUI.Rectangle(quarterWidth, quarterHeight, glyphWidth, glyphHeight), this.shadowColour);
	gfx.drawRect(new CanvasUI.Rectangle(quarterWidth * 1.5, quarterHeight * 1.5, glyphWidth, glyphHeight), this.shadowColour);
}

/**
 * Draws the gadget's border.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.WindowDepthButton.prototype.drawBorder = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	if (this.clicked) {
		gfx.drawBevelledRect(drawRect, this.shadowColour, this.shineColour);
	} else {
		gfx.drawBevelledRect(drawRect, this.shineColour, this.shadowColour);
	}
}


/** Window Methods **/

CanvasUI.Window.prototype = new CanvasUI.Gadget;

CanvasUI.Window.prototype.constructor = CanvasUI.Window;

/**
 * Draws the gadget.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.Window.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	gfx.fillGradientRect(drawRect, 0, 0, this.rect.width, this.rect.height, [{ offset: 0, colour: '#000' }, { offset: 1, colour: '#555' }]);
}

/**
 * Draws the gadget's border.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.Window.prototype.drawBorder = function(gfx) {
	var borderRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	var titleRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.borderSize.top);
	var leftRect = new CanvasUI.Rectangle(0, this.borderSize.top - 1, this.borderSize.left, this.rect.height - this.borderSize.top + 1);
	var rightRect = new CanvasUI.Rectangle(this.rect.width - this.borderSize.right, this.borderSize.top - 1, this.borderSize.right, this.rect.height - this.borderSize.top + 1);
	var bottomRect = new CanvasUI.Rectangle(0, this.rect.height - this.borderSize.bottom, this.rect.width, this.borderSize.bottom);
	
	// Choose border colour based on focus
	var colour1 = this.focused ? '#ddf' : '#eef';
	var colour2 = this.focused ? '#99f' : '#bbf';
	var colour3 = this.focused ? '#88f' : '#aaf';
	
	// Draw left
	gfx.fillRect(leftRect, colour3);
	
	// Draw right
	gfx.fillRect(rightRect, colour3);
	
	// Draw top
	gfx.fillGradientRect(titleRect, 0, 0, 0, titleRect.height,
		[
			{ offset: 0, colour: colour1 },
			{ offset: 0.2, colour: colour2 },
			{ offset: 1, colour: colour3 }
		]
	);

	var fontHeight = parseInt(gfx.fontSize);
	var titleX = ((this.getWidth() - this.children.at(0).getWidth() - this.children.at(1).getWidth() - gfx.getTextWidth(this.title)) / 2) + this.children.at(0).getWidth();
	var titleY = this.borderSize.top - (fontHeight / 2);
	gfx.fillText(this.title, titleX, titleY, this.shadowColour);
	
	// Draw bottom
	gfx.fillRect(bottomRect, colour3);
	
	// Draw inner bevelled rect
	var innerRect = this.getClientRect();
	innerRect.y--;
	innerRect.x--;
	innerRect.height++;
	innerRect.width++;
	gfx.drawBevelledRect(innerRect, this.shadowColour, this.shineColour);
	
	// Draw outline
	gfx.drawBevelledRect(borderRect, this.shineColour, this.shadowColour);
}

/**
 * Called when the window is clicked.  Raises the window to the top of the stack
 * and starts the dragging system if the top border is clicked.
 * @param x The x co-ordinate of the click.
 * @param y The y co-ordinate of the click.
 */
CanvasUI.Window.prototype.processClick = function(x, y) {

	// Ensure gadget is topmost in collection
	this.raiseToTop();

	// Only drag if click within title bar
	if (this.draggable) {
		if (y < 0) {
			this.dragged = true;
		}
	}
}

/**
 * Called when the window is dragged.  Moves the window to the new co-ordinates.
 * @param x The x co-ordinate of the drag.
 * @param y The y co-ordinate of the drag.
 * @param dx The x distance moved.
 * @param dy The y distance moved.
 */
CanvasUI.Window.prototype.processDrag = function(x, y, dx, dy) {
	this.moveTo(this.rect.x + dx, this.rect.y + dy);
}


/** ListBox Methods **/

CanvasUI.ListBox.prototype = new CanvasUI.Gadget;

CanvasUI.ListBox.prototype.constructor = CanvasUI.ListBox;

/**
 * Draws the gadget.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.ListBox.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	gfx.fillRect(drawRect, this.backColour);
	
	var rect = this.getClientRect();
	var itemHeight = (parseInt(gfx.fontSize) + this.spacing);
	var itemY = rect.y;
	var itemX = rect.x;
	var itemWidth = rect.width;
	var itemHeight = this.itemHeight;
	
	for (var i = 0; i < this.options.length; ++i) {
		var itemRect = new CanvasUI.Rectangle(rect.x, itemY - this.viewY, itemWidth, itemHeight);
		
		if (!this.options[i].selected) {
			gfx.fillRect(itemRect, this.shineColour);
		} else {
			gfx.fillRect(itemRect, this.highlightColour);
		}
		
		gfx.fillText(this.options[i].text, rect.x, rect.y + itemRect.y + this.itemHeight - (this.itemHeight / 2), this.shadowColour);
		
		itemY += this.itemHeight;
	}
}

/**
 * Draws the gadget's border.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.ListBox.prototype.drawBorder = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	gfx.drawBevelledRect(drawRect, this.shineColour, this.shadowColour);
}

/**
 * Add a new option to the listbox.
 * @param text The option text.
 * @param value The option value.
 */
CanvasUI.ListBox.prototype.addOption = function(text, value) {
	this.options.push(new CanvasUI.ListBoxOption(text, value));
}

/**
 * Called when the listbox is dragged.  Scrolls the option list.
 * @param x The x co-ordinate of the drag.
 * @param y The y co-ordinate of the drag.
 * @param dx The x distance moved.
 * @param dy The y distance moved.
 */
CanvasUI.ListBox.prototype.processDrag = function(x, y, dx, dy) {
	this.viewY -= dy;
	if (this.viewY < 0) this.viewY = 0;
	
	var rect = this.getClientRect();
	var maxY = (this.itemHeight * this.options.length) - rect.height;
	
	if (this.viewY > maxY) this.viewY = maxY;
	this.markRectsDamaged();
}

/**
 * Called when the listbox is clicked.  Selects the clicked option and starts
 * the dragging system.
 * @param x The x co-ordinate of the click.
 * @param y The y co-ordinate of the click.
 */
CanvasUI.ListBox.prototype.processClick = function(x, y) {
	this.dragged = true;
	
	// Get the click y co-ord relative to the gadget
	var localY = y + this.viewY;

	// Get the index of the clicked item
	var index = Math.floor(localY / this.itemHeight);
	
	// Toggle the item's selected state
	this.options[index].selected = !this.options[index].selected;
	
	if (this.onValueChange != null) this.onValueChange(this);
}


/** Vertical scrollbar Methods **/

CanvasUI.ScrollbarVertical.prototype = new CanvasUI.Gadget;

CanvasUI.ScrollbarVertical.prototype.constructor = CanvasUI.ScrollbarVertical;

/**
 * Draws the gadget.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.ScrollbarVertical.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	gfx.fillRect(drawRect, this.backColour);
	
	var colour = this.dragged ? '#fff' : '#555';

	gfx.fillRect(this.getGripRect(), colour);
}

/**
 * Draws the gadget's border.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.ScrollbarVertical.prototype.drawBorder = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	gfx.drawBevelledRect(drawRect, this.shineColour, this.shadowColour);
}

/**
 * Called when the scrollbar is clicked.  Starts the dragging system.
 * @param x The x co-ordinate of the click.
 * @param y The y co-ordinate of the click.
 */
CanvasUI.ScrollbarVertical.prototype.processClick = function(x, y) {

	var gripRect = this.getGripRect();

	if (gripRect.contains(x, y)) {
		this.dragged = true;
	} else {

		if (y > gripRect.y) {
			this.setValue(this.value + this.pageSize);
		} else if (y < gripRect.y) {
			this.setValue(this.value - this.pageSize);
		}
	}
}

/**
 * Called when the scrollbar is dragged.  Moves the grip.
 * @param x The x co-ordinate of the drag.
 * @param y The y co-ordinate of the drag.
 * @param dx The x distance moved.
 * @param dy The y distance moved.
 */
CanvasUI.ScrollbarVertical.prototype.processDrag = function(x, y, dx, dy) {

	var rect = this.getClientRect();

	var range = this.maximumValue - this.minimumValue;
	var ratio = range / rect.height;

	this.setValue(this.value + (dy * ratio));

	this.markRectsDamaged();
}

CanvasUI.ScrollbarVertical.prototype.getGripRect = function() {
	var rect = this.getClientRect();

	// If pageSize is greater than 1 we aren't dealing with a slider - we have
	// a scrollbar.  In that situation, we need to subtract the page size from
	// the maximum value to cater for the fact that we only scroll when the
	// page is full.
	var maxValue = this.pageSize > 1 ? this.maximumValue - this.pageSize : this.maximumValue;
	var range = this.maximumValue - this.minimumValue;
	var ratio = range / rect.height;
	var gripSize = this.pageSize / ratio;
	var span = rect.height - gripSize;

	if (span == 0) return new CanvasUI.Rectangle(rect.x, rect.y, rect.width, rect.height);
	if (this.value == this.minimumValue) return new CanvasUI.Rectangle(rect.x, rect.y, rect.width, gripSize);

	range = maxValue - this.minimumValue;

	var value = ((this.value - this.minimumValue) * span + range) / range;

	return new CanvasUI.Rectangle(rect.x, rect.y + value, rect.width, gripSize);
}

CanvasUI.ScrollbarVertical.prototype.setValue = function(value) {
	var oldValue = this.value;

	this.value = value;

	// If pageSize is greater than 1 we aren't dealing with a slider - we have
	// a scrollbar.  In that situation, we need to subtract the page size from
	// the maximum value to cater for the fact that we only scroll when the
	// page is full.
	var maxValue = this.pageSize > 1 ? this.maximumValue - this.pageSize : this.maximumValue;

	if (this.value > maxValue) this.value = maxValue;
	if (this.value < this.minimumValue) this.value = this.minimumValue;

	if (oldValue != this.value) {
		if (this.onValueChange != null) this.onValueChange(this);
	}
}


/** Horizontal scrollbar Methods **/

CanvasUI.ScrollbarHorizontal.prototype = new CanvasUI.Gadget;

CanvasUI.ScrollbarHorizontal.prototype.constructor = CanvasUI.ScrollbarHorizontal;

/**
 * Draws the gadget.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.ScrollbarHorizontal.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	gfx.fillRect(drawRect, this.backColour);
	
	var colour = this.dragged ? '#fff' : '#555';

	gfx.fillRect(this.getGripRect(), colour);
}

/**
 * Draws the gadget's border.
 * @param gfx The Graphics object to draw with.
 */
CanvasUI.ScrollbarHorizontal.prototype.drawBorder = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	gfx.drawBevelledRect(drawRect, this.shineColour, this.shadowColour);
}

/**
 * Called when the scrollbar is clicked.  Starts the dragging system.
 * @param x The x co-ordinate of the click.
 * @param y The y co-ordinate of the click.
 */
CanvasUI.ScrollbarHorizontal.prototype.processClick = function(x, y) {

	var gripRect = this.getGripRect();

	if (gripRect.contains(x, y)) {
		this.dragged = true;
	} else {

		if (x > gripRect.x) {
			this.setValue(this.value + this.pageSize);
		} else if (x < gripRect.x) {
			this.setValue(this.value - this.pageSize);
		}
	}
}

/**
 * Called when the scrollbar is dragged.  Moves the grip.
 * @param x The x co-ordinate of the drag.
 * @param y The y co-ordinate of the drag.
 * @param dx The x distance moved.
 * @param dy The y distance moved.
 */
CanvasUI.ScrollbarHorizontal.prototype.processDrag = function(x, y, dx, dy) {

	var rect = this.getClientRect();

	var range = this.maximumValue - this.minimumValue;
	var ratio = range / rect.width;

	this.setValue(this.value + (dx * ratio));

	this.markRectsDamaged();
}

CanvasUI.ScrollbarHorizontal.prototype.getGripRect = function() {
	var rect = this.getClientRect();

	// If pageSize is greater than 1 we aren't dealing with a slider - we have
	// a scrollbar.  In that situation, we need to subtract the page size from
	// the maximum value to cater for the fact that we only scroll when the
	// page is full.
	var maxValue = this.pageSize > 1 ? this.maximumValue - this.pageSize : this.maximumValue;
	var range = this.maximumValue - this.minimumValue;
	var ratio = range / rect.width;
	var gripSize = this.pageSize / ratio;
	var span = rect.width - gripSize;

	if (span == 0) return new CanvasUI.Rectangle(rect.x, rect.y, rect.width, rect.height);
	if (this.value == this.minimumValue) return new CanvasUI.Rectangle(rect.x, rect.y, gripSize, rect.height);

	range = maxValue - this.minimumValue;

	var value = ((this.value - this.minimumValue) * span + range) / range;

	return new CanvasUI.Rectangle(rect.x + value, rect.y, gripSize, rect.height);
}

CanvasUI.ScrollbarHorizontal.prototype.setValue = function(value) {
	var oldValue = this.value;

	this.value = value;

	// If pageSize is greater than 1 we aren't dealing with a slider - we have
	// a scrollbar.  In that situation, we need to subtract the page size from
	// the maximum value to cater for the fact that we only scroll when the
	// page is full.
	var maxValue = this.pageSize > 1 ? this.maximumValue - this.pageSize : this.maximumValue;

	if (this.value > maxValue) this.value = maxValue;
	if (this.value < this.minimumValue) this.value = this.minimumValue;

	if (oldValue != this.value) {
		if (this.onValueChange != null) this.onValueChange(this);
	}
}
