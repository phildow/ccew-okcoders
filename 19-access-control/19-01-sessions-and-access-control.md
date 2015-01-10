Session Management and Access Control
====================================

Managing access to resources on a web server involves three processes: authentication, session management and access control. In the first step we provide a means for a user to sign up and log in to a site. In the second we track the fact that a user is logged in so that we know who is making requests to the site. In the third step we limit access to certain resources to a subset of all the sites visitors and users.

We implemented authentication in the last chapter. Users can create an account on the site and log into it. But we aren't tracking users as they move across the site and so we don't know who's visiting which pages. The fact that a user is logged in is not being preserved across multiple http requests.

In this chapter we will implement user tracking and through it control access to certain site resources. Tracking users will rely on browser cookies and session management.

A cookie is a small piece of data sent from the server to the browser in response to a particular request, such as signing up or logging in. The browser resends the cookie with every additional request to the site. The server can identify a particular user from those requests by associating a unique user identifier with the cookie data, such as the user's ObjectId from the mongo database.

*In effect, after logging in a user is sending her user id with every request she makes*. The server trusts that the user is who she says she is because she authenticated with her email address and password before receiving the cookie.

Together this combination of authentication, cookies and user identification is called session management.

A site with session management can then restrict access to resources based on the identity of the user. Access control assigns privileges to users that grant them access to resources and then ensures that only authorized visitors actually do access them. This can be as simple as checking if a user is logged in at all or if she is an administrator or not.


## References

[HTTP Cookies](http://en.wikipedia.org/wiki/HTTP_cookie)

Wikipedia's entry on brower cookies.

[Sessions](http://en.wikipedia.org/wiki/Session_(computer_science))

Wikipedia's entry on sessions.

[Passport](http://passportjs.org/)

A node module that implements user authentication through a number of strategies such as email and password, twitter, facebook, etc. 

[Passport-local](https://github.com/jaredhanson/passport-local)

The passport module for supporting local user sign in with username and password.

[HTTP Secure](http://en.wikipedia.org/wiki/HTTP_Secure)

How the 's' in the https protocol works and why it's necessary.

## Cookies and Sessions

Waylon Flinn will deliver a guest lecutre on cookies and sessions.

Note: addition of `req.session` object.

## Passport Session Management

We will use the passport module for session management in our application. Passport describes itself as authentication middleware for node.js applications. It supports multiple *strategies* or techniques for authenticating a user, such as via username and password, facebook or twitter. Passport also supports session management and provides an interface for *serializing* and *deserializing* a user, which here means the process of turning a database user object into cookie data and back.

Passport advocates moving our application's authentication logic into one of its strategies. Instead of handling sign up and login in our user router we implement it in a passport strategy and call that code from our router.

Although this is an excellent way to keep your code modular, especially when dealing with more complicated authentication strategies such as twitter of facebook login, we're going to bypass this step in our application and move directly to the session management that passport also provides.

**Installing passport**

Let's start with installation. Add the `passport` module to your project:

	$ npm install passport --save

In *app.js* require passport and tell the application to use it. The `app.use` call for the passport middleware should occur after the `app.use` call that sets up cookies and sessions. Also require the `User` model as we'll be using it for user serialization:

```js
var passport = require('passport');
var User = require('./models/user');
...
app.use(passport.initialize());
app.use(passport.session());
```

Next set up user serialization. Serialization will control what information is set in the cookie so that passport can manage the session data:

```js
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
```

For serialization all we're doing is mapping an instance of a User to its id. `done` is the callback passport expects to complete the serialization. It takes an error parameter and the data that will be stored in the cookie. Calling `done(null, user.id)` says that no error occurred and instructs passport to store only the user's id in the cookie.

In deserialization passport provides the cookie data, namely the serialized id, to our function callback. Our callback uses the mongoose `User` model to find a user by its id and passes the resulting `user` instance to the `done` function with any errors.

Serialization will occur when a user logs in. Passport uses this function to derive the data we want stored in the cookie. The browser then sends this data back with every request. The passport middleware will call our deserialization function with the cookie data from the request, which locates the user in the database by its id, and then it will make the user object available on the request object `req` in all our route handlers.

**Log in a user**

Let's add passport session code to our login route. This will tie an authenticated user to a session and cause serialization to occur. In the `POST /users/login` route, replace the code block that handles a successful login:

```js
req.flash('success', "You're now logged in.");
res.redirect('/posts');
```

with a call to `req.login`, which takes a user object and function callback:

```js
} else {
  req.login(user, function(err) {
    if (err) { 
      res.render('500'); 
    } else {
      req.flash('success', "You're now logged in.")
      res.redirect('/posts');
    }
  });
}
```

All we're doing here is calling the `req.login` function which passport adds to the `req` object to manage a user's session. We handle errors but otherwise still flash and redirect as we were before.

Restart the server and try logging in. You shouldn't see any difference. But from another route in the application we can now see that you are logged in because Passport adds the `req.user` object to every new http request. We can access it in our route handlers.

From the `GET /posts` router handler log `req.user`:

```js
router.get('/', function(req, res) {
  console.log(req.user);
  ...
});
```

Restart the server and visit `/posts`. You'll see "undefined" logged to the console. Log in. You're redirected to /posts, and now that route handler prints the user object to the console.

*The fact that a particular user has logged in is now being persisted across multiple requests.*

## Controlling Access

<!-- https://github.com/jaredhanson/passport/blob/master/lib/http/request.js -->
Passport provides a number of utility methods on the request object `req`. We've already seen the `login` method. Passport also provides a `logout` method and an `isAuthenticated` method: 

```js
req.login(user, function(err) { ... })
req.logout()
req.isAuthenticated()
```

We can use the `isAuthenticated` method to check if a user is logged into the site. All we have to do is call it and passport checks if the `req.user` object is set and if passport is being used.

Let's check to see if a user is authenticated when they attempt to create a new post:

```js
router.get('/new', function(req, res) {
  if (!req.isAuthenticated()) {
    req.flash('danger', 'You must log in before creating a new post');
    res.redirect('/users/login');
  } else {
    var post = new Post();
    res.render('posts/new', {post: post});
  }
});
```

Restart the server and visit the `/posts/new` page. You will be redirected to the login page thanks to our new authentication check. Log in, which redirects you back to posts. Visit `/posts/new` again and you now have access to the create form. You are authenticated.

Challenge: how can we set it up so that a user is redirected back to the create form in the first place without hardcoding it?

Our authentication logic isn't quite complete. We actually only want administrators to be able to access the create form, so we should also look at the `req.user` object, which is an instance of the mongoose model `User`, and check the value of `admin`.

Replace:

```js
if (!req.isAuthenticated()) {
  ...
```

with:

```js
if (!req.isAuthenticated() || !req.user.admin) {
  ...
```

Except we don't actually have an administator! When we signed up for our own account the default value for `admin` was `false`. We need to go into the database and manually update our user:

```
$ mongo
> use blog
> db.users.find()
{ "_id" : ObjectId("53dfc64e7112e9c24077a123"), ...
> db.users.update({ _id: ObjectId("53dfc64e7112e9c24077a123") }, { $set: { admin: true } })
> WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
```

Restart the server and revisit `/posts/new` once again. Sign in and revisit the page. Your administrator account now has access. Sign in as a different user and you can no longer visit the new post form. Administrators have access but regular users do not, and visitors certainly don't.

**Abstracting access control and extending it**

We need to provide this access control to more than one route. For posts we must apply it to the five routes that manage creating, updating and deleting posts:

```js
router.get('/new', function(req, res) { ...
router.post('/', function(req, res) { ...

router.get('/:id/edit', function(req, res) { ...
router.put('/:id', function(req, res) { ...

router.delete('/:id', function(req, res) { ...
```

Rather than copying and pasting that access control code into each route handler we'll move it into its own function so that the code only exists in one location. We'll then take advantage of express's support for adding middleware to specific routes to ensure that the access control code executes before the code specific to the route does.

Create a new function `isAdmin` at the bottom of `routes/posts.js`  that checks if a user is signed in (authenticated) and if they are an admin. This function will be *middleware*, so it will take three parameters, a `req`, `res` and `next`:

<!-- did we need more on middleware in earlier chapters? -->

```js
function isAdmin(req, res, next) {
  if (!req.isAuthenticated() || !req.user.admin) {
    req.flash('danger', 'You must log in before creating a new post');
    res.redirect('/users/login');
  } else {
    next();
  }
}
```

We can then insert that function into specific routes. Modify the `GET /posts/new` router call so that the `isAdmin` middleware is added as another parameter before our custom handler:

```js
router.get('/new', isAdmin, function(req, res) {
  var post = new Post();
  res.render('posts/new', {post: post});
});
```

We haven't seen this before. All of the `router` methods allow us to specify additional middleware before the router callback. We give it the function we want called without actually calling it. The router will then call the middleware first when a request matches this url. 

Like all middleware, the middeware can handle the request itself or pass it on to the next handler. In this case our code handles the request if the visitor is not authenticated or isn't an administrator, redirecting them to the login page. Otherwise it calls `next()` which tells express to pass the request to the route's own application code.

Restart the server and verify that access control is still working as expected. Visit `/posts/new`, log in, and revisit `/posts/new`.

Now that we've isolated the access control into a single function we can simply insert the `isAdmin` middleware into every route that requires that control:

```js
router.get('/new', isAdmin, function(req, res) { ...
router.post('/', isAdmin, function(req, res) { ...

router.get('/:id/edit', isAdmin, function(req, res) { ...
router.put('/:id', isAdmin, function(req, res) { ...

router.delete('/:id', isAdmin, function(req, res) { ...
```

This is fairly clean code. We've isolated our access control from the route specific code and kept our route handlers simple.

You could imagine writing similar `isUser` middleware for the comments routing.

## Details: Redirects, Logging Out and Signing In

**Redirecting a user back to the page they came from**

It's frustrating that a user who wants to create a new post is redirected back to the posts index after they've successfully logged in. Really they should be redirected back to the page they just came from. How can we do that? Think about this for a moment before reading on.

Collect the facts. We know that right now we're hardcoding the redirect when a user successfully logs in, and we know that we'll need to change this to redirect back to the page they just came from:

```js
router.post('/login', function(req, res) {
  ...
  req.flash('success', "You're now logged in.")
  res.redirect('/posts');
```

Which means we also know we've got to remember that last page across multiple http requests. We've just learned how to persist information across requests: with session variables. The question now is where do we set that session variable and how do we retrieve it.

We must set the session variable prior to redirecting a user to the login page, and there's really only one place we can do that, in our new `isAdmin` function. The `req` object contains the original url in `req.originalUrl`, so we can just assign that to a session variable of our choosing. Let's call it `redirect`:

```js
function isAdmin(req, res, next) {
  if (!req.isAuthenticated() || !req.user.admin) {
    req.flash('danger', 'You must log in before creating a new post');
    req.session.redirect = req.originalUrl;
    res.redirect('/users/login');
  }  else {
    next();
  }
}
```

Then in our login code, instead of hardcoding the success redirect, let's check first if the `req.session.redirect` variable is set and redirect to that url if it is:

```js
router.post('/login', function(req, res) {
  ...
  req.login(user, function(err) {
    if (err) { 
      res.render('500'); 
    } else {
      if (req.session.redirect) {
        res.redirect(req.session.redirect);
        delete req.session.redirect;
      } else {
        res.redirect('/posts');
      }
    }
 });
```

Note that we also take care to delete the `req.session.redirect` variable so that it isn't available in later requests.

Restart the server and go to create a post. You're redirected to log in. After you log in you are redirected back to creating a new post. And this will work from any page. Nice.

Remember, what's incredible about all this is that with that single line to set a session variable and then another line to retrieve it we're actually sending an extra bit of information in the form of a cookie back to the browser and the browser is sending it back to us on the next request. This extra bit of information accompanies the user serialization. We can send many independent pieces of data with cookies.

**Logging a user out**

Right now our logout function doesn't actually do anything except flash a message. If we are tracking users across sessions it is the responsibility of the logout function to destroy the session so that the cookie associated with it is deleted and no user will be associated with future visits from the same browser. Passport provides a means to do this.

Modify the `GET /users/logout` route to call `req.logout`, one of the methods passport adds to the `req` object:

```js
router.get('/logout', function(req, res) {
  req.logout();
  req.flash('success', "You're now logged out.");
  res.redirect('/posts');
});
```

Restart the server and log in. Go to create a post. You have access. Log out at `/users/logout`. Try to create a post again. You no longer have access. The cookie has been deleted and the session is no longer valid. 

**Logging in a user when they sign up**

Right now when a user signs up their information is added to the database but they are not actually logged in. If they were to try to create a comment they would not have access. We might want to verify the email address before actually letting a new user sign in, but let's keep it simple and just log them in immediately. We'll use the same `req.login` function:

```js
router.post('/signup', function(req, res) {
  ...
  user.save(function(err) {
    if (err) {
      res.render('500');
    } else {
      req.login(user, function(err) {
        if (err) { 
          res.render('500'); 
        } else {
          req.flash('success', "Thank's for signing up! You're now logged in.")
          res.redirect('/users/profile');
        }
      });
    }
 });
```

We add a call to `req.login` after the user has successfully signed up and been saved to the database. Naturally we check for errors but otherwise the code is the same: flash a message and redirect them to a url of your choosing.

<!--
**Remembering visitors**

...
-->

## Using an Authentication Strategy

Passport is primarily used to manage authentication strategies. It adds session management. We've bypassed passport's authentication strategies, opting to keep our user sign up and login code from the previous chapter. It's an excellent idea to isolate that code and move it to a passport authentication strategy, and example code to do this will be added later.

<!--
...

	$ npm install passport-local --save
...

```js
var LocalStrategy = require('passport-local').Strategy
var User = require('./models/user');
```
...

Finally we provide the *strategy* for local connection:

...
```js
passport.use('local', new LocalStrategy({ 
    usernameField : 'email',
    passReqToCallback : true
  }, 
  function(req, email, password, done) {
    console.log('Running local strategy');
    User.findOne({ email: email }, function(err, user) {
      if (err) { 
        return done(err); 
      } else if (!user || !user.isValidPassword(password)) { 
        return done(null, false, req.flash('danger', 'Email or password is incorrect')); 
      } else {
        return done(null, user, req.flash('success', 'You are logged in'));
      }
    });
}));
```

Explain exactly how this works. ... What kind of value does the strategy callback expect? What is the result of calling `done` and what does it return?

Handling database errors, user not found errors and invalid password errors.

What is the advantage of moving our authentication logic into passport? For one we've abstracted it into ... but more importantly passport is now also managing a user session.

We'll now have passport authenticate our user when they attempt to log in rather than us. That means we replace the code in `POST /users/login`:

```js
var passport = require('passport');
...
router.post('/login', passport.authenticate('local', {
  failureRedirect: '/users/login',
  successRedirect: '/posts'
}));
```
...

```js
router.post('/login', passport.authenticate('local', {
  failureRedirect: '/users/login',
  successRedirect: '/posts'
}));
```
...

```js
router.post('/login', passport.authenticate('local', { failureRedirect: '/users/login' }), function(req, res) {
  if (req.session.redirect) {
    res.redirect(req.session.redirect);
    delete req.session.redirect;
  } else {
    res.redirect('/posts');
  }
});
```
...
-->

## Summary

Managing access to resources on a web server involves three processes: authentication, session management and access control. We've now implemented all three of these processes and so have the ability to limit post creation to administrators and comment creation to commentors. We now have a fully functional if simple blogging application with the support for resources and users that are required of any blogging platform.