/**
 * CanvasUI namespace contains all core functionality.
 */
var CanvasUI = {

	/**
	 * Gadget class is the base class for all UI widgets.
	 */
	Gadget: function(x, y, width, height) {
		this.rect = null;
		this.children = null;
		this.parent = null;
		this.clicked = false;
		this.focused = false;
		this.dragged = false;
		this.visible = true;
		this.enabled = true;
		this.draggable = true;
		this.borderSize = null;
		this.grabX = 0;
		this.grabY = 0;
		this.backColour = '#eee';
		this.shineColour = '#fff';
		this.shadowColour = '#000';
		this.darkColour = '#555';
		this.eventHandlers = null;
		this.focusedGadget = null;
		
		this.init(x, y, width, height);
	},
		
	/**
	 * Node in the binary display tree.
	 */
	DisplayNode: function(rect, left, right, gadget) {
		this.rect = rect;
		this.left = left;
		this.right = right;
		this.gadget = gadget;
	},
		
	/**
	 * Builds a scene graph of the specified gadget using a BSP tree.
	 */
	DisplayTree: function(gadget) {
		this.topNode = null;
		this.leaves = new Array();
		this.owningGadget = gadget;
	},
		
	/**
	 * Rectangle class.
	 */
	Rectangle: function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	},
		
	/**
	 * List of gadgets.
	 */
	GadgetCollection: function(gadget) {
		this.list = new Array();
		this.gadget = gadget;
	},

	/**
	 * List of gadget event handlers.  Raises events to all handlers.
	 */
	GadgetEventHandlerList: function(gadget) {
		this.owningGadget = gadget;
		this.list = new Array();
	},

	/**
	 * Controls the BSP tree that describes the layout of clipping regions on
	 * the canvas.
	 */
	DisplayManager: function(gadget) {
		this.tree = null;
		this.topLevelGadget = gadget;
	},

	/**
	 * Graphics class for drawing to canvas.
	 */
	Graphics: function(gadget) {
		this.owningGadget = gadget;
		this.canvas = gadget.getCanvas();
		this.context = this.canvas == null ? null : this.canvas.getContext("2d");
		this.displayManager = gadget.getDisplayManager();
		this.fontSize = "12px";
		this.fontFamily = "sans-serif";
	},
	
	/**
	 * Handles gadget events.  Should be subclassed and the handler methods
	 * should be overridden.
	 */
	GadgetEventHandler: function() {
		this.handleClickEvent = function(gadget, x, y) { }
		this.handleReleaseEvent = function(gadget, x, y) { }
		this.handleReleaseOutsideEvent = function(gadget, x, y) { }
		this.handleDragEvent = function(gadget, x, y) { }
		this.handleFocusEvent = function(gadget) { }
		this.handleBlurEvent = function(gadget) { }
	},
	
	/**
	 * Size of gadget borders
	 */
	BorderSize: function(top, right, bottom, left) {
		this.top = top;
		this.right = right;
		this.bottom = bottom;
		this.left = left;
	},
	
	/**
	 * Top-level gadget that contains the rest of the UI.  An instance of this
	 * should be created in order to create a UI.
	 */
	Gui: function(canvas) {

		// Call base constructor
		CanvasUI.Gadget.prototype.constructor.call(this, 0, 0, canvas.width, canvas.height);
		
		/**
		 * Called when the canvas is clicked - compensates for canvas offset from
		 * top of document body and dispatches to the UI.
		 */
		this.handleClick = function(e) {
			var x = e.clientX - canvas.offsetLeft + window.pageXOffset;
			var y = e.clientY - canvas.offsetTop + window.pageYOffset;
			
			this.click(x, y);
		}

		/**
		 * Called when the canvas is released - compensates for canvas offset from
		 * top of document body and dispatches to the UI.
		 * TODO: Make this handle scrolling offset of document.
		 */
		this.handleRelease = function(e) {
			var x = e.clientX - canvas.offsetLeft + window.pageXOffset;
			var y = e.clientY - canvas.offsetTop + window.pageYOffset;

			if (this.clickedGadget != null) this.clickedGadget.release(x, y);
		}
		
		/**
		 * Called when the mouse moves over the canvas - compensates for canvas
		 * offset from top of document body and dispatches to the UI.
		 * TODO: Make this handle scrolling offset of document.
		 */
		this.handleDrag = function(e) {
			var x = e.clientX - canvas.offsetLeft + window.pageXOffset;
			var y = e.clientY - canvas.offsetTop + window.pageYOffset;
			
			if (this.clickedGadget != null) this.clickedGadget.drag(x, y);
		}
		
		// Set member values
		this.draggable = false;
		this.visible = false;
		
		this.canvas = canvas;			// Drawing space
		this.topLevelGadget = null;		// Toplevel gadget
		this.clickedGadget = null;		// Currently clicked gadget
		this.focusedGadget = null;		// Currently focused gadget
		this.displayManager = null;		// Manages the clipping rects

		// Grab a pointer to the canvas and set up event handlers
		var obj = this;
		this.canvas.addEventListener("mousedown", function(e) { obj.handleClick(e); }, false);
		this.canvas.addEventListener("mouseup", function(e) { obj.handleRelease(e); }, false);
		this.canvas.addEventListener("mouseout", function(e) { obj.handleRelease(e); }, false);
		this.canvas.addEventListener("mousemove", function(e) { obj.handleDrag(e); }, false);

		// Set up the clip rect manager
		this.displayManager = new CanvasUI.DisplayManager(this);
		this.displayManager.createTree();
	},
	
	/**
	 * Clickable button that displays text.
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
	 * Clickable button that displays text.
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
	 * Window that can contain child gadgets.
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
		
		// Define event handler for close button
		var eventHandler = new CanvasUI.GadgetEventHandler();
		eventHandler.handleReleaseEvent = function(gadget, x, y) {
			gadget.parent.close();
		}
		closeButton.eventHandlers.addHandler(eventHandler);
	},
	
	ListBox: function(x, y, width, height) {
		CanvasUI.Gadget.prototype.constructor.call(this, x, y, width, height);
		
		this.borderSize.top = 1;
		this.borderSize.right = 1;
		this.borderSize.bottom = 1;
		this.borderSize.left = 1;
		
		this.options = new Array();
		this.spacing = 4;
		this.selected = false;
	},
	
	ListBoxOption: function(text, value) {
		this.text = text;
		this.value = value;
	}
}

CanvasUI.Graphics.prototype.drawBevelledRect = function(rect, lightColour, darkColour) {
	if (this.context == null) return;
	
	this.fillRect(new CanvasUI.Rectangle(rect.x, rect.y, rect.width, 1), lightColour);
	this.fillRect(new CanvasUI.Rectangle(rect.x, rect.y, 1, rect.height), lightColour);
	this.fillRect(new CanvasUI.Rectangle(rect.x + rect.width - 1, rect.y, 1, rect.height), darkColour);
	this.fillRect(new CanvasUI.Rectangle(rect.x, rect.y + rect.height - 1, rect.width, 1), darkColour);
}
			
CanvasUI.Graphics.prototype.drawRect = function(rect, colour) {
	if (this.context == null) return;
	
	for (var i = 0; i < this.displayManager.tree.leaves.length; ++i) {
		if (this.displayManager.tree.leaves[i].gadget == this.owningGadget) {
			this.drawClippedRect(rect, colour, this.displayManager.tree.leaves[i].rect);
		}
	}
}

CanvasUI.Graphics.prototype.fillText = function(text, x, y, colour) {
	if (this.context == null) return;
	
	for (var i = 0; i < this.displayManager.getLeaves().length; ++i) {
		if (this.displayManager.getLeaves()[i].gadget == this.owningGadget) {
			this.fillClippedText(text, x, y, colour, this.displayManager.getLeaves()[i].rect);
		}
	}
}
		
CanvasUI.Graphics.prototype.fillClippedText = function(text, x, y, colour, clipRect) {
	if (this.context == null) return;
		
	// Compensate for gadget offset
	x += this.owningGadget.getX();
	y += this.owningGadget.getY();

	this.context.save();
	this.context.beginPath();
	this.context.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
	this.context.clip();
	
	this.context.fillStyle = colour;
	this.context.font = this.fontSize + ', ' + this.fontFamily;
	this.context.fillText(text, x, y);
	this.context.closePath();
	this.context.restore();
}

CanvasUI.Graphics.prototype.getTextWidth = function(text) {
	if (this.context == null) return 0;
	
	this.context.save();
	this.context.font = this.fontSize + ', ' + this.fontFamily;
	var width = this.context.measureText(text).width
	this.context.restore();
	
	return width;
}
	
CanvasUI.Graphics.prototype.drawClippedRect = function(rect, colour, clipRect) {
	if (this.context == null) return;
		
	// Compensate for gadget offset
	var x = rect.x + this.owningGadget.getX();
	var y = rect.y + this.owningGadget.getY();

	this.context.save();
	this.context.beginPath();
	this.context.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
	this.context.clip();
	
	this.context.strokeStyle = colour;
	this.context.strokeRect(x, y, rect.width, rect.height);
	this.context.closePath();
	this.context.restore();
}
		
CanvasUI.Graphics.prototype.fillClippedRect = function(rect, colour, clipRect) {
	if (this.context == null) return;
		
	// Compensate for gadget offset
	var x = rect.x + this.owningGadget.getX();
	var y = rect.y + this.owningGadget.getY();

	this.context.save();
	this.context.beginPath();
	this.context.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
	this.context.clip();
	
	this.context.fillStyle = colour;
	this.context.fillRect(x, y, rect.width, rect.height);
	this.context.closePath();
	this.context.restore();
}
		
CanvasUI.Graphics.prototype.fillRect = function(rect, colour) {
	if (this.context == null) return;
	
	for (var i = 0; i < this.displayManager.getLeaves().length; ++i) {
		if (this.displayManager.getLeaves()[i].gadget == this.owningGadget) {
			this.fillClippedRect(rect, colour, this.displayManager.getLeaves()[i].rect);
		}
	}
}

CanvasUI.DisplayManager.prototype.createTree = function() {
	this.tree = new CanvasUI.DisplayTree(this.topLevelGadget);
	this.tree.createTree();
}

CanvasUI.DisplayManager.prototype.repartitionTree = function(gadget) {
	this.tree.repartition(gadget, null);
}

CanvasUI.DisplayManager.prototype.getLeaves = function() {
	return this.tree.leaves;
}

/**
 * Add a gadget event handler to the list.
 */
CanvasUI.GadgetEventHandlerList.prototype.addHandler = function(handler) { this.list.push(handler); }

/**
 * Remove a gadget event handler from the list.
 */
CanvasUI.GadgetEventHandlerList.prototype.removeHandler = function(handler) {
	for (var i in this.list) {
		if (this.list[i] == handler) {
			this.list.splice(i, 1);
		}
	}
}
		
/**
 * Raise a click event to to all handlers in the list.
 */
CanvasUI.GadgetEventHandlerList.prototype.raiseClickEvent = function(x, y) {
	for (var i in this.list) {
		this.list[i].handleClickEvent(this.owningGadget, x, y);
	}
}

/**
 * Raise a release event to to all handlers in the list.
 */
CanvasUI.GadgetEventHandlerList.prototype.raiseReleaseEvent = function(x, y) {
	for (var i in this.list) {
		this.list[i].handleReleaseEvent(this.owningGadget, x, y);
	}
}

/**
 * Raise a release outside event to to all handlers in the list.
 */
CanvasUI.GadgetEventHandlerList.prototype.raiseReleaseOutsideEvent = function(x, y) {
	for (var i in this.list) {
		this.list[i].handleReleaseOutsideEvent(this.owningGadget, x, y);
	}
}
		
/**
 * Raise a drag event to to all handlers in the list.
 */
CanvasUI.GadgetEventHandlerList.prototype.raiseDragEvent = function(x, y) {
	for (var i in this.list) {
		this.list[i].handleDragEvent(this.owningGadget, x, y);
	}
}

/**
 * Raise a focus event to to all handlers in the list.
 */
CanvasUI.GadgetEventHandlerList.prototype.raiseFocusEvent = function() {
	for (var i in this.list) {
		this.list[i].handleFocusEvent(this.owningGadget);
	}
}

/**
 * Raise a blur event to to all handlers in the list.
 */
CanvasUI.GadgetEventHandlerList.prototype.raiseBlurEvent = function() {
	for (var i in this.list) {
		this.list[i].handleBlurEvent(this.owningGadget);
	}
}

/**
 * Add a gadget to the collection.
 */
CanvasUI.GadgetCollection.prototype.add = function(gadget) {
	gadget.parent = this.gadget;
	this.list.push(gadget);
	
	// Rebuild the display tree of the gadget
	if (this.gadget != null) {
		if (this.gadget.getDisplayManager() != null) {
			this.gadget.getDisplayManager().repartitionTree(this.gadget);
		}
	}
	
	gadget.draw();
}

CanvasUI.GadgetCollection.prototype.remove = function(gadget) {
	var index = this.getGadgetIndex(gadget);
	if (index > -1) {
		this.list.splice(index, 1);
	}
	
	gadget.parent = null;
	
	this.gadget.getDisplayManager().repartitionTree(this.gadget);
	this.gadget.draw();
}
		
/**
 * Get the number of gadgets in the collection.
 */
CanvasUI.GadgetCollection.prototype.length = function() { return this.list.length; }
		
/**
 * Get the gagdet at the specified index.
 */
CanvasUI.GadgetCollection.prototype.at = function(index) { return this.list[index]; }
		
/**
 * Draw all items in the collection.
 */
CanvasUI.GadgetCollection.prototype.draw = function() {
	for (var i in this.list) {
		this.list[i].draw();
	}
}

/**
 * Raise the specified gadget to the top (ie. end) of the collection.
 */
CanvasUI.GadgetCollection.prototype.raiseToTop = function(gadget) {		
	var index = this.getGadgetIndex(gadget);
	if (index > -1) {
		this.list.splice(index, 1);
		this.add(gadget);
	}
}
		
/**
 * Locate gadget in list.
 */
CanvasUI.GadgetCollection.prototype.getGadgetIndex = function(gadget) {
	for (var i in this.list) {
		if (this.list[i] == gadget) {
			return i;
		}
	}
	
	return -1;
}

/**
 * Create the initial tree state.
 */
CanvasUI.DisplayTree.prototype.createTree = function() {
	this.topNode = new CanvasUI.DisplayNode(this.owningGadget.rect, null, null, this.owningGadget);
	this.leaves = new Array();
	
	this.partition(this.topNode, this.owningGadget.children.length() - 1);
}

/**
 * Remove the dead leaves from the leaf array.  A leaf is considered
 * dead if it belongs to the gadget being repartitioned, or
 * the gadget it belongs to is a child of the repartitioned gadget.
 */
CanvasUI.DisplayTree.prototype.removeDeadLeaves = function(gadget) {

	var i = 0;
	while (i < this.leaves.length) {
		var leafGadget = this.leaves[i].gadget;
		
		// Check the leaf's gadget and that gadget's ancestors to see
		// if the leaf is affected by the repartition.  If so, remove
		// the leaf
		while (leafGadget != null) {
			if (leafGadget == gadget) {
			
				// Leaf affected by partition, so remove it
				this.leaves.splice(i, 1);
				break;
			}
			
			leafGadget = leafGadget.parent;
		}
	
		// Advance to next leaf if we did not remove one
		if (leafGadget == null) {
			++i;
		}
	}
}

/**
 * Recalculate the tree for a given gadget.
 */
CanvasUI.DisplayTree.prototype.repartition = function(gadget, node) {

	// Special case - gadget is topmost gadget, in which case recreate tree
	if (gadget == null) {
		this.createTree();
		return;
	}
	
	// Obtain the top node if not specified
	if (node == null) {
		node = this.topNode;
		
		this.removeDeadLeaves(gadget);
	}
	
	// If this node contains the gadget, repartition it
	if (node.gadget == gadget) {
		node.left = null;
		node.right = null;
		this.partition(node, gadget.children.length() - 1);
		return;
	}

	// This node does not contain the gadget, so recurse into children
	if (node.left != null) this.repartition(gadget, node.left);
	if (node.right != null) this.repartition(gadget, node.right);
}

CanvasUI.DisplayTree.prototype.partition = function(node, childIndex) {

	// Guard against empty nodes
	if ((node.rect.width == 0) || (node.rect.height == 0)) return;

	var child = null;
	
	var childX1;
	var childX2;
	var childY1;
	var childY2;

	while ((node.left == null) && (childIndex > -1)) {
		
		// Ignore any invisible children
		do {
			child = node.gadget.children.at(childIndex);
			
			if (!child.visible) childIndex--;
		} while ((!child.visible) && (childIndex > -1));
	
		// Calculate child co-ords
		childX1 = child.getX();
		childY1 = child.getY();
		childX2 = childX1 + child.getWidth() - 1;
		childY2 = childY1 + child.getHeight() -1;
		
		// Attempt to partition the node
		if ((childX1 > node.rect.x) && (childX1 < node.rect.x + node.rect.width - 1)) {
			// Partition at left edge
			this.horizSplit(node, childX1 - 1);
		
		} else if ((childX2 >= node.rect.x) && (childX2 < node.rect.x + node.rect.width - 1)) {
			// Partition at right edge
			this.horizSplit(node, childX2);

		} else if ((childX1 <= node.rect.x) && (childX2 >= node.rect.x + node.rect.width - 1)) {
			// Attempt to partition vertically only if the child intersects the node
		
			if ((childY1 > node.rect.y) && (childY1 < node.rect.y + node.rect.height - 1)) {
				// Partition at top edge
				this.vertSplit(node, childY1 - 1);
			
			} else if ((childY2 >= node.rect.y) && (childY2 < node.rect.y + node.rect.height - 1)) {
				// Partition at bottom edge
				this.vertSplit(node, childY2);
			
			} else if ((childY1 <= node.rect.y) && (childY2 >= node.rect.y + node.rect.height - 1)) {
				
				// Node is totally surrounded by the child gadget
				node.gadget = child;
			
				this.partition(node, child.children.length() - 1);
				return;
			}
		}
	
		// Move to the next child if no partitioning has taken place
		if (node.left == null) childIndex--;
	}

	// Attempt to partition any newly-created subnodes
	if (node.left != null) {
	
		// Continue partitioning
		this.partition(node.left, childIndex);
		this.partition(node.right, childIndex);
	} else {
		this.leaves.push(node);
	}
}

CanvasUI.DisplayTree.prototype.horizSplit = function(node, x) {

	// Create left split
	var leftRect = new CanvasUI.Rectangle(node.rect.x, node.rect.y, (x - node.rect.x) + 1, node.rect.height);
	node.left = new CanvasUI.DisplayNode(leftRect, null, null, node.gadget);

	// Create right split
	var rightRect = new CanvasUI.Rectangle(x + 1, node.rect.y, node.rect.width - leftRect.width, node.rect.height);
	node.right = new CanvasUI.DisplayNode(rightRect, null, null, node.gadget);
}

CanvasUI.DisplayTree.prototype.vertSplit = function(node, y) {
	
	// Create top split
	var topRect = new CanvasUI.Rectangle(node.rect.x, node.rect.y, node.rect.width, (y - node.rect.y) + 1);
	node.left = new CanvasUI.DisplayNode(topRect, null, null, node.gadget);
	
	// Create bottom split
	var bottomRect = new CanvasUI.Rectangle(node.rect.x, y + 1, node.rect.width, node.rect.height - topRect.height);
	node.right = new CanvasUI.DisplayNode(bottomRect, null, null, node.gadget);
}

CanvasUI.Gadget.prototype.init = function(x, y, width, height) {
	this.rect = new CanvasUI.Rectangle(x, y, width, height);
	this.children = new CanvasUI.GadgetCollection(this);
	this.eventHandlers = new CanvasUI.GadgetEventHandlerList(this);
	this.borderSize = new CanvasUI.BorderSize(0, 0, 0, 0);
}

/**
 * Gets the X co-ord of the gadget relative to the top-level gadget.
 */
CanvasUI.Gadget.prototype.getX = function() {
	if (this.parent != null) {
		return this.rect.x + this.parent.getX();
	}
	
	return this.rect.x;
}

/**
 * Gets the Y co-ord of the gadget relative to the top-level gadget.
 */
CanvasUI.Gadget.prototype.getY = function() {
	if (this.parent != null) {
		return this.rect.y + this.parent.getY();
	}
	
	return this.rect.y;
}

CanvasUI.Gadget.prototype.getWidth = function() { return this.rect.width; }

CanvasUI.Gadget.prototype.getHeight = function() { return this.rect.height; }

CanvasUI.Gadget.prototype.getClientRect = function() {
	var x = this.borderSize.left;
	var y = this.borderSize.top;
	var width = this.getWidth() - this.borderSize.right - this.borderSize.left;
	var height = this.getHeight() - this.borderSize.bottom - this.borderSize.top;
	
	return new CanvasUI.Rectangle(x, y, width, height);
}

CanvasUI.Gadget.prototype.isVisible = function() {
	if (!this.visible) return false;
	if (this.parent == null) return this.visible;
	return (this.parent.isVisible());
}

CanvasUI.Gadget.prototype.isEnabled = function() {
	if (!this.enabled) return false;
	if (this.parent == null) return this.enabled;
	return (this.parent.isEnabled());
}

CanvasUI.Gadget.prototype.getDisplayManager = function() {
	if (this.parent != null) return this.parent.getDisplayManager();
	return null;
}

CanvasUI.Gadget.prototype.getCanvas = function() {
	if (this.parent != null) return this.parent.getCanvas();
	return null;
}

CanvasUI.Gadget.prototype.setClickedGadget = function(gadget) {
	if (this.parent != null) this.parent.setClickedGadget(gadget);
}

CanvasUI.Gadget.prototype.getClickedGadget = function() {
	if (this.parent != null) return this.parent.getClickedGadget();
	return null;
}

CanvasUI.Gadget.prototype.close = function() {
	if (this.parent != null) {
		this.parent.children.remove(this);
	}
}

CanvasUI.Gadget.prototype.draw = function() {
	if (!this.isVisible()) return;
	
	var gfx = new CanvasUI.Graphics(this);
	
	this.drawBackground(gfx);
	this.drawBorder(gfx);
	this.children.draw();
}

CanvasUI.Gadget.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	gfx.fillRect(drawRect, this.backColour);
}

CanvasUI.Gadget.prototype.drawBorder = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	if (this.clicked) {
		gfx.drawBevelledRect(drawRect, this.shadowColour, this.shineColour);
	} else {
		gfx.drawBevelledRect(drawRect, this.shineColour, this.shadowColour);
	}
}

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

CanvasUI.Gadget.prototype.setFocusedGadget = function(gadget) {
	if (this.focusedGadget != gadget) {
		if (this.focusedGadget != null) {
			this.focusedGadget.blur();
		}
	}
	
	this.focusedGadget = gadget;
	
	this.focus();
}

CanvasUI.Gadget.prototype.focus = function() {
	var hadFocus = this.focused;
	this.focused = true;
	
	if (this.parent != null) {
		this.parent.setFocusedGadget(this);
	}
	
	this.draw();
	
	if (!hadFocus) {
		this.eventHandlers.raiseFocusEvent();
		return true;
	}
	
	return false;
}

CanvasUI.Gadget.prototype.blur = function() {
	var hadFocus = this.focused;
	this.focused = false;
	
	if (this.focusedGdget != null) {
		this.focusedGadget.blur();
		this.focusedGadget = null;
	}
	
	this.draw();
	
	if (hadFocus) {
		this.eventHandlers.raiseBlurEvent();
		return true;
	}
	
	return false;
}

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
	
	this.grabX = x - this.rect.x;
	this.grabY = y - this.rect.y;
	
	this.onClick(x, y);
	
	this.draw();
	
	this.eventHandlers.raiseClickEvent(x, y);
	
	return true;
}

CanvasUI.Gadget.prototype.onClick = function(x, y) { }

CanvasUI.Gadget.prototype.release = function(x, y) {

	if (this.clicked) {
		this.clicked = false;
		this.dragged = false;
		
		if (this.getClickedGadget() == this) this.setClickedGadget(null);
		
		this.draw();
		
		// Released within the gadget or outside?
		if (this.checkPointCollision(x, y)) {
			this.eventHandlers.raiseReleaseEvent(x, y);
		} else {
			this.eventHandlers.raiseReleaseOutsideEvent(x, y);
		}
		
		return true;
	}

	return false;
}

CanvasUI.Gadget.prototype.drag = function(x, y) {
	
	if (this.dragged) {
		this.moveTo(x - this.grabX, y - this.grabY);
		
		this.eventHandlers.raiseDragEvent(x, y);
			
		return true;
	}
	
	return false;
}

CanvasUI.Gadget.prototype.getMinChildX = function() {
	return this.borderSize.left;
}

CanvasUI.Gadget.prototype.getMinChildY = function() {
	return this.borderSize.right;
}

CanvasUI.Gadget.prototype.getMaxChildX = function() {
	return this.rect.width - this.borderSize.left - this.borderSize.right - 1;
}

CanvasUI.Gadget.prototype.getMaxChildY = function() {
	return this.rect.height - this.borderSize.top - this.borderSize.bottom - 1;
}

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

CanvasUI.Gadget.prototype.hide = function() {
	if (this.visible) {
		this.visible = false;
		
		this.getDisplayManager().repartitionTree(this.parent);
		
		// Redraw the parent if there is one
		if (this.parent != null) {
			this.parent.draw();
		} else {
			
			// No parent, so wipe the canvas
			var ctx = canvas.getContext("2d");
			ctx.fillRect(0, 0, canvas.width, canvas.height, '#FFF');
		}
	}
}

CanvasUI.Gadget.prototype.show = function() {
	if (!this.visible) {
		this.visible = true;
		
		this.getDisplayManager().repartitionTree(this.parent);
		this.draw();
	}
}

CanvasUI.Gadget.prototype.raiseToTop = function() {
	if (this.parent != null) {
		this.hide();
		this.parent.raiseChildToTop(this);
		this.show();
	}
}

CanvasUI.Gadget.prototype.raiseChildToTop = function(child) {
	this.children.raiseToTop(child);
}

/**
 * Top level gadget.
 */
CanvasUI.Gui.prototype = new CanvasUI.Gadget;

CanvasUI.Gui.prototype.constructor = CanvasUI.Gui;

CanvasUI.Gui.prototype.drawBorder = function(gfx) { }

CanvasUI.Gui.prototype.getCanvas = function() { return this.canvas; }

CanvasUI.Gui.prototype.getDisplayManager = function() { return this.displayManager; }

CanvasUI.Gui.prototype.setClickedGadget = function(gadget) {
	this.clickedGadget = gadget;
}

CanvasUI.Gui.prototype.getClickedGadget = function() { return this.clickGadget; }

/**
 * Button gadget.
 */
CanvasUI.Button.prototype = new CanvasUI.Gadget;

CanvasUI.Button.prototype.constructor = CanvasUI.Button;

CanvasUI.Button.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	var textX = (this.rect.width - gfx.getTextWidth(this.text)) / 2;
	var textY = this.rect.height - (parseInt(gfx.fontSize) / 2);
	
	if (this.clicked) {
		gfx.fillRect(drawRect, this.darkColour);
		gfx.fillText(this.text, textX, textY, this.shineColour);
	} else if (this.isEnabled()) {
		gfx.fillRect(drawRect, this.backColour);
		gfx.fillText(this.text, textX, textY, this.shadowColour);
	} else {
		gfx.fillRect(drawRect, this.backColour);
		gfx.fillText(this.text, textX + 1, textY + 1, this.shadowColour);
		gfx.fillText(this.text, textX, textY, this.shineColour);
	}
}

CanvasUI.Button.prototype.drawBorder = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	if (this.clicked) {
		gfx.drawBevelledRect(drawRect, this.shadowColour, this.shineColour);
	} else {
		gfx.drawBevelledRect(drawRect, this.shineColour, this.shadowColour);
	}
}

/**
 * Window close button.
 */
CanvasUI.WindowCloseButton.prototype = new CanvasUI.Gadget;

CanvasUI.WindowCloseButton.prototype.constructor = CanvasUI.WindowCloseButton;

CanvasUI.WindowCloseButton.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	var textX = (this.rect.width - gfx.getTextWidth(this.text)) / 2;
	var textY = this.rect.height - (parseInt(gfx.fontSize) / 2);
	
	var colour = this.parent.focused ? '#aaf' : '#ddf';
	colour = this.parent.dragged ? '#88f' : colour;
	
	gfx.fillRect(drawRect, colour);
	gfx.fillRect(drawRect, colour);
	var quarterWidth = (this.rect.height / 4);
	var quarterHeight = (this.rect.height / 4);
	var glyphWidth = (this.rect.width / 2);
	var glyphHeight = (this.rect.height / 2);
	gfx.drawRect(new CanvasUI.Rectangle(quarterWidth, quarterHeight, glyphWidth, glyphHeight), this.shadowColour);
}

CanvasUI.WindowCloseButton.prototype.drawBorder = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	
	if (this.clicked) {
		gfx.drawBevelledRect(drawRect, this.shadowColour, this.shineColour);
	} else {
		gfx.drawBevelledRect(drawRect, this.shineColour, this.shadowColour);
	}
}


/**
 * Window gadget.
 */
CanvasUI.Window.prototype = new CanvasUI.Gadget;

CanvasUI.Window.prototype.constructor = CanvasUI.Window;

CanvasUI.Window.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	gfx.fillRect(drawRect, this.backColour);
}

CanvasUI.Window.prototype.drawBorder = function(gfx) {
	var borderRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	var titleRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.borderSize.top);
	var leftRect = new CanvasUI.Rectangle(0, this.borderSize.top - 1, this.borderSize.left, this.rect.height - this.borderSize.top + 1);
	var rightRect = new CanvasUI.Rectangle(this.rect.width - this.borderSize.right, this.borderSize.top - 1, this.borderSize.right, this.rect.height - this.borderSize.top + 1);
	var bottomRect = new CanvasUI.Rectangle(0, this.rect.height - this.borderSize.bottom, this.rect.width, this.borderSize.bottom);
	
	// Choose border colour based on focus
	var borderColour = this.focused ? '#aaf' : '#ddf';
	
	// Update border colour based on drag
	borderColour = this.dragged ? '#88f' : borderColour;
	
	// Draw left
	gfx.fillRect(leftRect, borderColour);
	
	// Draw right
	gfx.fillRect(rightRect, borderColour);
	
	// Draw top
	gfx.fillRect(titleRect, borderColour);
	var fontHeight = parseInt(gfx.fontSize);
	gfx.fillText(this.title, ((this.getWidth() - this.children.at(0).getWidth() - gfx.getTextWidth(this.title)) / 2) + this.children.at(0).getWidth(), this.borderSize.top - (fontHeight / 2), this.shadowColour);
	
	// Draw bottom
	gfx.fillRect(bottomRect, borderColour);
	
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
		
CanvasUI.Window.prototype.onClick = function(x, y) {

	// Ensure gadget is topmost in collection
	this.raiseToTop();

	// Only drag if click within title bar
	if (this.draggable) {
		if (y - this.getY() < this.borderSize.top) {
			this.dragged = true;
		}
	}
}

/**
 * ListBox gadget.
 */
CanvasUI.ListBox.prototype = new CanvasUI.Gadget;

CanvasUI.ListBox.prototype.constructor = CanvasUI.ListBox;

CanvasUI.ListBox.prototype.drawBackground = function(gfx) {
	var drawRect = new CanvasUI.Rectangle(0, 0, this.rect.width, this.rect.height);
	gfx.fillRect(drawRect, this.backColour);
	
	var rect = this.getClientRect();
	var itemHeight = (parseInt(gfx.fontSize) + this.spacing);
	
	for (var i = 0; i < this.options.length; ++i) {
		var itemRect = new CanvasUI.Rectangle(0, rect.y + (itemHeight * i), this.rect.width, (parseInt(gfx.fontSize) + this.spacing));
		gfx.fillRect(itemRect, this.shineColour);
		gfx.fillText(this.options[i].text, itemRect.x + this.spacing, itemRect.y + itemHeight - (this.spacing / 2), this.shadowColour);
	}
}

CanvasUI.ListBox.prototype.addOption = function(text, value) {
	this.options.push(new CanvasUI.ListBoxOption(text, value));
}
