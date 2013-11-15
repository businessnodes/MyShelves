Images = new Meteor.Collection("images");
BookRequests = new Meteor.Collection("bookRequests");

if (Meteor.isClient) {								
	Meteor.startup(function() {
		filepicker.setKey("AvmGNQqKSNCTVPvZ2bhJ4z");
		Session.setDefault("page", "home");
	});
	
	Template.content.rendered = function() {
		$("#add-tag-form").dialog({
			autoOpen: false,
			height: 185,
			width: 350,
			modal: true,
			buttons: {
				Add: function() {
					Images.update(Images.find().fetch()[
						$(".carousel .active").index()]._id, 
						{$push: {tags: {tag: $("#new-tag").val()}}});
					$(this).dialog("close");
				},
				Cancel: function() {
					$(this).dialog("close");
				}
			},
			close: function() {
				$("#new-tag").val('');
			}
		});
		$("#registration-form").dialog({
			autoOpen: false,
			height: 475,
			width: 500,
			modal: true,
			buttons: {
				Register: function() {
					var email = $.trim($("#email").val());
					var password = $.trim($("#password").val());
					var confirm_password = $.trim($("#confirm_password").val());
					// do simple validation stuff
					if (!isEmail(email))
						$("#error_email").show();
					else
						$("#error_email").hide();
					if (password.length < 5)
						$("#error_password").show();
					else
						$("#error_password").hide();
					if (confirm_password.length < 5) {
						$("#error_confirm_password").show();
						$("#error_confirm_password li:first").show();
					}
					else
						$("#error_confirm_password li:first").hide();
					if (password != confirm_password) {
						$("#error_confirm_password").show();
						$("#error_confirm_password li:last").show();
					}
					else
						$("#error_confirm_password li:last").hide();
					if (isEmail(email) && password.length > 4 && password == confirm_password) {
						var options = {
							email: email,
							password: password
						};
						// get user's profile name
						var profile_name = $.trim($("#name").val());
						if (profile_name)
							options.profile = {name: profile_name};
						// get user's username
						var username = $.trim($("#username").val());
						if (username)
							options.username = username;
						Accounts.createUser(options);
						$(this).dialog("close");
					}
				}
			}
		});
		$("#cancel-request-form").dialog({
			autoOpen: false,
			height: 185,
			width: 350,
			modal: true,
			buttons: {
				Yes: function() {
					BookRequests.remove($("#request-to-delete").val());
					$(this).dialog("close");
				}
			}
		});
		$("#decline-loan-form").dialog({
			autoOpen: false,
			height: 185,
			width: 350,
			modal: true,
			buttons: {
				Yes: function() {
					BookRequests.remove($("#request-to-delete").val());
					$(this).dialog("close");
				}
			}
		});
		$("#delete-image-form").dialog({
			autoOpen: false,
			height: 185,
			width: 350,
			modal: true,
			buttons: {
				Yes: function() {
					Images.remove($("#image-to-delete").val());
					$(this).dialog("close");
				}
			}
		});
		$("#edit-tags-form").dialog({
			autoOpen: false,
			height: 215,
			width: 350,
			modal: true,
			buttons: {
				Ok: function() {
					var id = $("#image-to-edit").val();
					// delete old tags
					Images.update(id,
						{$set: {tags: []}});
					// push new tags
					var tags = $("#edit-tags").val().split(",");
					for (var i = 0; i < tags.length; i++) {
						Images.update(id,
							{$push: {tags: {tag: tags[i]}}});
					}
					$(this).dialog("close");
				},
				Cancel: function() {
					$(this).dialog("close");
				}
			}
		});
	};
	
	function isEmail(email) {
		var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
		return regex.test(email);
	}

	Template.user_actions.events({
		'click .account_images': function() {
			Session.set("page", "account_images");
		},
		'click .account': function() {
			Session.set("page", "account");
		},
		'click .logout': function() {
			Meteor.logout();
		},
		'click .add-tag': function() {
			$("#add-tag-form").dialog("open");
		},
		'click .upload': function() {			
			filepicker.pickAndStore({mimetype:"image/*"}, 
				{location:"S3"}, 
				function(InkBlobs) {
					Images.insert({image: InkBlobs[0].url,
						user: Meteor.user()});
					console.log(JSON.stringify(InkBlobs));
				}
			);
		},
		'click .lenders': function() {
			Session.set("page", "lenders");
		},
		'click .borrowers': function() {
			Session.set("page", "borrowers");
		}
	});
	
	Template.search.events({
		'click .btn': function() {
			Session.set("search_query", $.trim($("#query").val()));
			Session.set("page", "search");
			return false;
		}
	});
	
	Template.search_results.events({
		'click .thumbnail': function() {
			Session.set("page", "home");
		}
	});

	Template.content.pageIs = function(page) {
		return Session.equals("page", page);
	};
	
	Template.request_book.events({
		'click .btn': function() {
			var user = Meteor.user();
			if (user == null) 
				$("#registration-form").dialog("open");
			else {
				// show highlight div for request notification 
				$("#request-notification").fadeIn();
				$("#book-name").val("");
				// get active carousel image
				var carouselImage = Images.find().fetch()[
					$(".carousel .active").index()];
				// insert a BookRequest object
				BookRequests.insert({
					image: carouselImage,
					book_name: $("#book-name").val(),
					user: user,
					isApproved: false
				}); 
				// get user email address
				var email;
				if (user.emails)
					email = user.emails[0].address;
				else
					email = user.services.facebook.email;
				// sends email to book requester
				Meteor.call('sendEmail',
					email,
					'admin@lookshelf.meteor.com',
					'Book Request',
					'Your request for <em>' + $("#book-name").val()
					+ '</em> has been sent.');
				// notify book owner that a new BookRequest has been
				// created for one of his books.
				Meteor.call('sendEmail',
					carouselImage.user.services.facebook.email,
					'admin@lookshelf.meteor.com',
					'Book Request',
					'You have a new book request for <em>' 
					+ $("#book-name").val()+ '</em>');
			}
			return false;
		}
	});
	
	Template.lenders.events({	
		'click .cancel-request': function() {
			$("#request-to-delete").val(this._id);
			$("#cancel-request-form").dialog("open");
		}
	});
	
	Template.borrowers.events({
		'click .approve-loan': function() {
			BookRequests.update(this._id, {
				$set: {isApproved: true}
			});
			var email;
			if (this.user != null)
				email = this.user.services.facebook.email;
			else
				email = this.email;
			Meteor.call('sendEmail',
						email,
						'admin@lookshelf.meteor.com',
						'Book Request',
						'Your request for book ' 
						+ this.book_name +
						' has been approved.');
		},
		'click .decline-loan': function() {
			$("#request-to-delete").val(this._id);
			$("#decline-loan-form").dialog("open");
		}
	});
	
	Template.account_images.events({
		'click .edit-tags': function() {
			var tags = [];
			this.tags.forEach(function(tag){
				tags.push(tag.tag);
			});
			$("#edit-tags").val(tags.join());
			$("#image-to-edit").val(this._id);
			$("#edit-tags-form").dialog("open");
		},
		'click .delete-shelf': function() {
			$("#image-to-delete").val(this._id);
			$("#delete-image-form").dialog("open");
		}
	});

	Deps.autorun(function() {
		Template.home.activeImage = function() {
			return Images.find().fetch()[0];
		};
		Template.home.images = function() {
			return Images.find().fetch().slice(1);
		};
		Template.search_results.thumbnails = function() {
			return Images.find({
				"tags.tag": new RegExp(Session.get("search_query"), 
					"ig")}
				);
		};
		Template.lenders.bookRequests = function() {
			return BookRequests.find({
				"user._id": Meteor.userId()
			});
		};
		Template.borrowers.bookRequests = function() {
			return BookRequests.find({
				"image.user._id": Meteor.userId()
			});
		};
		Template.account.shelf_tags = function() {
			return Images.find({"user._id": Meteor.userId()});
		};
		Template.account_images.thumbnails = function() {
			return Images.find({"user._id": Meteor.userId()});
		};
	});
}

if (Meteor.isServer) {
	Meteor.startup(function() {
		// code to run on server at startup
		process.env.MAIL_URL = 'smtp://postmaster%40lookshelf.meteor.com:7zkje0yw-am5@smtp.mailgun.org:587';
		process.env.MONGOHQ_URL = 'mongodb://tom:qwerty@paulo.mongohq.com:10012/lookshelf';
	});
	
	Meteor.methods({
		sendEmail: function(to, from, subject, text) {
			check([to, from, subject, text], [String]);
			this.unblock();
			Email.send({
				to: to,
				from: from,
				subject: subject,
				text: text 
			});
		} 
	});
}
