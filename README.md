# pirple-nodejs-assignment2

Second assignment for the NodeJS masterclass from Pirple

## Description

API built on Node.js with no dependencies. PizzaDelivery API allows users to register, edit profile, create carts and order their favourite pizzas. Admin/Employees users can modify any cart and order Payment through Stripe API. Notifications by email using Mailgun.

## Using the API

Set Content-Type as application/json in headers.

Token is always required in headers, except when creating a user or creating a token.

### USERS - post - /users

All fields are required except role, which defaults to "user" if not specified.

Payload object :

```
{
"firstName" : "",
"lastName" : "",
"email" : "example@domain.com",
"password" : "1234",
"address" : {
"street" : "streetAddress",
"postcode" : "postcode",
"city" : "city",
"country" : "US"
},
"role" : "admin",
"tosAgreement" : true
}
```

### USERS - get - /users?email=emailAddress

User email is required in query parameters.

[http://localhost:3000/users?email=example@domain.com](http://localhost:3000/users?email=example@domain.com)

### USERS - put - /users

Payload object \(at least one must be specified\)

```
{
"firstName" : "",
"lastName" : "",
"email" : "example@domain.com",
"password" : "1234",
"address" : {
"street" : "streetAddress",
"postcode" : "postcode",
"city" : "city",
"country" : "US"
},
"role" : "admin"
}
```

### USERS - delete - /users?email=emailAddress

User email is required in query parameters.

[http://localhost:3000/users?email=example@domain.com](http://localhost:3000/users?email=example@domain.com)

### TOKENS - post - /tokens

Payload object :

```
{
"email" : "example@domain.com",
"password" : "1234"
}
```

### TOKENS - get - /tokens?id=tokenId

Token id \(20 characters string\) is required in query parameters.

[http://localhost:3000/tokens?id=abcdefghijklmnopqrst](http://localhost:3000/tokens?id=abcdefghijklmnopqrst)

### TOKENS - put - /tokens

Payload object \(all fields are required, we can only update the expire date\) :

```
{
"id" : "abcdefghijklmnopqrst",
"extend" : true
}
```

### TOKENS - delete - /tokens?id=tokenId

Token id \(20 characters string\) is required in query parameters.

[http://localhost:3000/tokens?id=abcdefghijklmnopqrst](http://localhost:3000/tokens?id=abcdefghijklmnopqrst)

### CARTS - post - /carts

Payload object:

```
{
"items" : [
{
"id" : 1,
"name" : "Napolitana",
"size" : "M",
"price" : 20,
"qty" : 2
},
{
"id" : 12,
"name" : "Carbonara",
"size" : "M",
"price" : 23,
"qty" : 1
}
]
}
```

### CARTS - get - /carts?id=cartId

Token id \(20 characters string\) is required in query parameters.

[http://localhost:3000/carts?id=abcdefghijklmnopqrst](http://localhost:3000/tokens?id=abcdefghijklmnopqrst)

### CARTS - put - /carts

Payload object \(all fields are required\) :

```
{
"id" : "abcdefghijklmnopqrst",
"item" : {
"id" : 12,
"name" : "Carbonara",
"size" : "M",
"price" : 23,
"qty" : 2
}
}
```

### CARTS - delete -/carts?id=cartId

Token id \(20 characters string\) is required in query parameters.

[http://localhost:3000/carts?id=abcdefghijklmnopqrst](http://localhost:3000/tokens?id=abcdefghijklmnopqrst)

### ORDERS - post - /orders

Payload object :

```
{
"cartId" : "abcdefghijklmnopqrst",
"stripeId" : "abcdefghijklmnopqrst",
"deliveryTime" : dateObject
}
```

### ORDERS - get - /orders?id=orderId

Token id \(20 characters string\) is required in query parameters.

[http://localhost:3000/orders?id=abcdefghijklmnopqrst](http://localhost:3000/tokens?id=abcdefghijklmnopqrst)

### ORDERS - put - /orders

Payload object :

```
{
"orderId" : "abcdefghijklmnopqrst",
"orderStatus" : "waitinglist"
}
```

### ORDERS - delete

Token id \(20 characters string\) is required in query parameters.

[http://localhost:3000/orders?id=abcdefghijklmnopqrst](http://localhost:3000/tokens?id=abcdefghijklmnopqrst)

### MENU - get - /menu

No query parameters needed.

[http://localhost:3000/menu](http://localhost:3000/menu)
