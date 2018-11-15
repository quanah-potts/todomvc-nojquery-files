// my first pass at removing jQuery from the jQuery todomvc app.js 
// in Gordon's repository. tried to explain changes in comments 
// as clearly as possible. 

// uses IIFE wrapping instead of jQuery's .ready()-type behavior 
(function () {
	'use strict';

	Handlebars.registerHelper('eq', function (a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		},
		store: function (namespace, data) {
			if (arguments.length > 1) {
				return localStorage.setItem(namespace, JSON.stringify(data));
			} else {
				var store = localStorage.getItem(namespace);
				return (store && JSON.parse(store)) || [];
			}
		},

    // an approximation of jQuery's .toggle() when a Boolean is passed in. 
    // takes a DOM element & a Boolean displayCondition as args. 
    // if the displayCondition is true, set element's display to 'block', else set it to 'none'. 
    // (considered 'inherit' for display, for some added possible flexibility, but 
    // I think 'block' works fine for our purposes) 
		toggleDisplay(element,displayCondition){
			if (displayCondition){
				element.style.display="block"; 
			}
			else{
				element.style.display="none"; 
			}
		}
	};

	var App = {
		init: function () {
			this.todos = util.store('todos-jquery');

			// setting each template's HTML as its own variable here, then passing them
			// into Handlebars.compile() to store as todoTemplate and footerTemplate 
			// for normal use. 
			var todoTemplateElementHTML = document.getElementById('todo-template').innerHTML; 
			var footerTemplateElementHTML = document.getElementById('footer-template').innerHTML;
			this.todoTemplate = Handlebars.compile(todoTemplateElementHTML);
			this.footerTemplate = Handlebars.compile(footerTemplateElementHTML);

			this.bindEvents();

			new Router({
				'/:filter': function (filter) {
					this.filter = filter;
					this.render();
				}.bind(this)
			}).init('/all');
		},

		bindEvents: function () {

			// may be a bit redundant, but for clarity, I've saved each element 
			// in its own variable.

			var newTodoElement = document.getElementById('new-todo'); 
			newTodoElement.addEventListener('keyup', this.create.bind(this));

			var toggleAllElement = document.getElementById('toggle-all'); 
			toggleAllElement.addEventListener('change', this.toggleAll.bind(this)); 

      var footerElement = document.getElementById('footer'); 
			// similar to Practical Javascript event listeners, the listener here 
			// uses the event object (e) to check what element was clicked (here, according to id).  
			// appropriate method is then called from App, passing in App as context.
			footerElement.addEventListener('click', function(e){
				var elementClicked = e.target; 
				if (elementClicked.id === 'clear-completed'){
					App.destroyCompleted.call(App);
				}
			}); 

      // using similar strategy to above, except comparing className instead of id. 
      // also, e must be passed in as additional parameter to .call() for each 
      // listener's callback function below, as the event is used in each.  
			var todoListElement = document.getElementById('todo-list'); 
			todoListElement.addEventListener('change', function(e){
				if (e.target.className === 'toggle'){
					App.toggle.call(App, e); 
				}
			});

			todoListElement.addEventListener('dblclick', function(e){
				if (e.target.tagName === 'LABEL'){
					App.edit.call(App, e); 
				}
			});
			
			todoListElement.addEventListener('keyup', function(e){
				if (e.target.className === 'edit'){
					App.editKeyup.call(App, e);
				}
			});

			todoListElement.addEventListener('focusout', function(e){
				if (e.target.className === 'edit'){
					App.update.call(App, e); 
				}
			});

			todoListElement.addEventListener('click', function(e){
				if (e.target.className === 'destroy'){
					App.destroy.call(App, e); 
				}
			});
    },
    
		render: function () {
			debugger;
			var todos = this.getFilteredTodos();

			// again, saving each element in its own variable.

      // instead of .html(), uses innerHTML to set todoListElement's HTML 
      // as todoTemplate from init. 
			var todoListElement = document.getElementById('todo-list'); 
			todoListElement.innerHTML = this.todoTemplate(todos); 

			// instead of .toggle(), uses the toggleDisplay method written in util above to  
			// determine 'main' element's display styling. 
			var mainElement = document.getElementById('main'); 
			util.toggleDisplay(mainElement,todos.length>0); 

			// instead of .prop(), explicitly sets the checked attribute on toggleAllElement according to 
			// whether or not there are 0 active todos 
			var toggleAllElement = document.getElementById('toggle-all'); 
			toggleAllElement.checked = (this.getActiveTodos().length === 0); 

			this.renderFooter();

			// uses simple native focus to put cursor at new-todo input element 
			var newTodoElement = document.getElementById('new-todo'); 
			newTodoElement.focus(); 

      // could include Beast 2 refactor here...but not part of assignment, I suppose...hmm
			util.store('todos-jquery', this.todos);
    },
    
		renderFooter: function () {
			var todoCount = this.todos.length;
			var activeTodoCount = this.getActiveTodos().length;
			var template = this.footerTemplate({
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount,
				filter: this.filter
			});

			// similar to render, uses util's toggleDisplay method on the footer element 
			// to determine its display css property
			var footerElement = document.getElementById('footer'); 
      util.toggleDisplay(footerElement, todoCount > 0); 

      // also, uses innerHTML instead of .html()
			footerElement.innerHTML=template; 
    },
    
		toggleAll: function (e) {

			// instead of using .prop(), get the checked attribute directly from the element  
			var toggleAllElement = e.target; 
			var isChecked = toggleAllElement.checked; 

			this.todos.forEach(function (todo) {
				todo.completed = isChecked;
			});

			this.render();
		},
		getActiveTodos: function () {
			return this.todos.filter(function (todo) {
				return !todo.completed;
			});
		},
		getCompletedTodos: function () {
			return this.todos.filter(function (todo) {
				return todo.completed;
			});
		},
		getFilteredTodos: function () {
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}

			return this.todos;
		},

		destroyCompleted: function () {
			this.todos = this.getActiveTodos();
			this.filter = 'all';
			this.render();
		},

		indexFromEl: function (el) {

			// el has access to Element.prototype.closest, which functions similarly to jQuery's .closest()
      var closestLi = el.closest('li'); 
      
  		// instead of using .data(), we can get the attribute named data-id from the li element
			var id = closestLi.getAttribute('data-id');
			var todos = this.todos;
			var i = todos.length;

			while (i--) {
				if (todos[i].id === id) {
					return i;
				}
			}
    },
    
		create: function (e) { 

			// instead of jQuery's .val(), uses .value property on the input element 
			var newTodoElement = e.target; 
			var val = newTodoElement.value.trim();

			if (e.which !== ENTER_KEY || !val) {
				return;
			}

			this.todos.push({
				id: util.uuid(),
				title: val,
				completed: false
			});

			newTodoElement.value='';

			this.render();
		},

		toggle: function (e) {
			var i = this.indexFromEl(e.target);
			this.todos[i].completed = !this.todos[i].completed;
			this.render();
		},

		edit: function (e) {

			// uses Element.prototype.closest instead of jQuery's .closest(). 
      var liElement = e.target.closest('li'); 

      // adds 'editing' to the li element's class list instead of using jQuery's .addClass(). 
			liElement.classList.add('editing'); 

			// uses querySelector instead of .find().
			var input = liElement.querySelector('.edit'); 

			// replicating the behavior of the previous code's second line... 
			input.value = input.value; 
			input.focus(); 
		},

		editKeyup: function (e) {
			if (e.which === ENTER_KEY) {
				e.target.blur();
			}

			if (e.which === ESCAPE_KEY) {

				// instead of using .data(), put abort property directly on the element object... 
				// not yet sure if this is best practice in vanilla js... 
				e.target.abort = true; 
				e.target.blur(); 
			}
		},

		update: function (e) {
      var el = e.target; 
      
			// replacing jQuery use of .val() with value property. 
			var val = el.value.trim(); 

			if (!val) {
				this.destroy(e);
				return;
			}
			//again, instead of .data(), manipulating abort property directly. 
			if (el.abort) { 
				el.abort = false; 
			} else {
				this.todos[this.indexFromEl(el)].title = val;
			}

			this.render();
		},

		destroy: function (e) {
			this.todos.splice(this.indexFromEl(e.target), 1);
			this.render();
		}
	};

	App.init();
})();
