if ('serviceWorker' in navigator) {
  // [Working example](/push-subscription-management_demo.html).
  const subscriptionButton = document.getElementById('subscriptionButton');

  // As subscription object is needed in few places let's create a method which
  // returns a promise.
  function getSubscription() {
    return navigator.serviceWorker.ready
        .then(registration => {
          return registration.pushManager.getSubscription();
        });
  }

  // Register service worker and check the initial subscription state.
  // Set the UI (button) according to the status.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(() => {
          console.log('service worker registered');
          subscriptionButton.removeAttribute('disabled');
        });
    getSubscription()
        .then(subscription => {
          if (subscription) {
            console.log('Already subscribed', subscription.endpoint);
            setUnsubscribeButton();
          } else {
            setSubscribeButton();
          }
        });
  }

  // Get the `registration` from service worker and create a new
  // subscription using `registration.pushManager.subscribe`. Then
  // register received new subscription by sending a POST request with its
  // endpoint to the server.
  function subscribe() {
    navigator.serviceWorker.ready.then(registration => {
      return registration.pushManager.subscribe({userVisibleOnly: true});
    }).then(subscription => {
      console.log('Subscribed', subscription.endpoint);
      return fetch('register-serviceworker', {
        method: 'post',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });
    }).then(setUnsubscribeButton);
  }

  // Get existing subscription from service worker, unsubscribe
  // (`subscription.unsubscribe()`) and unregister it in the server with
  // a POST request to stop sending push messages to
  // unexisting endpoint.
  function unsubscribe() {
    getSubscription().then(subscription => {
      return subscription.unsubscribe()
          .then(() => {
            console.log('Unsubscribed', subscription.endpoint);
            return fetch('unregister-serviceworker', {
              method: 'post',
              headers: {
                'Content-type': 'application/json'
              },
              body: JSON.stringify({
                endpoint: subscription.endpoint
              })
            });
          });
    }).then(setSubscribeButton);
  }

  // Change the subscription button's text and action.
  function setSubscribeButton() {
    subscriptionButton.onclick = subscribe;
    subscriptionButton.textContent = 'Subscribe!';
  }

  function setUnsubscribeButton() {
    subscriptionButton.onclick = unsubscribe;
    subscriptionButton.textContent = 'Unsubscribe!';
  }
}
