(function(){
    var paymentMethodToAttachTo = 'cheque'; // As in, the last part of #checkout_provider_checkout_cheque
    var providerListContainerSelector = '#provider_list';
    var commentsBoxSelector = 'textarea[name="ordercomments"]';
    var inputPlaceholderText = 'PO #';
    var poNumberRegex = /\[PO#:([^\]]+)\]/;
    var minimumPoNumberLength = 3;
    var container; // Contains the PO# entry input
    var input; // The input itself
    var inputAttributes = {
        'type'        : 'text',
        'placeholder' : inputPlaceholderText,
    };
    var allowedGroupName = 'Wholesale';

    init();



    function init(){
        // When the last checkout step is loaded, override a javascript function that it created.
        hookFunction(ExpressCheckout, 'ChangeStep', function(){
            console.log("Checking to hook!");
            if(
                ExpressCheckout.currentStep === "Confirmation"
                && !window.confirm_payment_provider.isHooked
            ) {
                _onCheckoutConfirmationStepLoaded();
            }
        });

        if(!isPaymentMethodAllowed()) {
        	enforceConditionalVisibility();
            console.log("Method is not allowed; Not adding any UI elements.");
            return;
        }

        createInputField();

        $('#CheckoutStepConfirmation')
            .on('change', providerListContainerSelector+' input[type="radio"]', onPaymentMethodSelectionChange)
        ;
    }

    function _onCheckoutConfirmationStepLoaded() {
        console.log("Adding hook!");
        hookIntoFormSubmission();
    }

    function hookIntoFormSubmission() {
        //hookFunction(ExpressCheckout, 'ConfirmPaymentProvider', function(providerWasValid){
        hookFunction(window, 'confirm_payment_provider', function(providerWasValid){
            /* This anonymous function gets called after ExpressCheckout.ConfirmPaymentProvider() has finished */
            if(!providerWasValid) {
                return providerWasValid; // This means the native function failed to validate the payment info. No need to do anything.
            }
            
            return checkoutProceedHandler();
        });
    }

    function showUiComponent() {
        var reference = getFormLabelElement();

        container
            .insertAfter(reference)
            .show()
        ;
    }

    function hideUiComponent() {
        container.hide();
    }

    function createInputField() {
        input = $('<input>')
            .on('keyup blur', onPoNumberInputChange)
            .attr(inputAttributes)
        ;

        container = $('<div>')
            .addClass('po-number-input-container')
            .append(input)
        ;
    }

    function getCurrentlySelectedPaymentMethod() {
        var selectedMethods = $(providerListContainerSelector).find('input:checked');
        if(selectedMethods.length < 1) {
            return false;
        }

        if(selectedMethods.length > 1) {
            throw "Something weird has happened: Multiple payment methods were selected. This should not be possible";
        }

        var selectedValue = selectedMethods.val();
        if(!selectedValue) {
            throw "Unable to determine value of selected payment method.";
        }

        return selectedValue.replace(/^checkout_/, '');
    }

    function updatePoNumberInOrderComments() {
        removePoNumberFromOrderComments();
        addPoNumberToOrderComments();
    }

    function addPoNumberToOrderComments() {
        var poValue = input.val();
        poValue = poValue.replace(/\]/g, '');
        if(!poValue) {
            return;
        }

        // Format it and put it in the first line.

        var commentsBox = $(commentsBoxSelector);

        var currentValue = commentsBox.val();

        var poString = "[PO#:"+poValue+"]";

        commentsBox.val(poString+"\n"+currentValue);
    }

    function removePoNumberFromOrderComments() {
        var commentsBox = $(commentsBoxSelector);

        var currentComments = commentsBox.val();

        var newComments = currentComments
            .replace(poNumberRegex, '')
            .trim()
        ;

        commentsBox.val(newComments);
    }

    function onPaymentMethodSelectionChange() {
        var currentMethod = getCurrentlySelectedPaymentMethod();

        console.log("Payment method changed to", currentMethod);

        if(currentMethod == paymentMethodToAttachTo) {
            updatePoNumberInOrderComments();
            showUiComponent();
        } else {
            hideUiComponent();
            removePoNumberFromOrderComments();
        }
    }

    function checkoutProceedHandler() {
        console.log("Checkout Proceed!!");

        if(getCurrentlySelectedPaymentMethod() != paymentMethodToAttachTo) {
            console.log(paymentMethodToAttachTo, "was not selected, so no validation is being performed.");
            removePoNumberFromOrderComments();
            return true;
        }

        try {
            validatePoNumber();
        } catch(exception) {
            alert(exception);
            return false;
        }

        updatePoNumberInOrderComments()

        return true;
    }

    function validatePoNumber() {
        var paymentMethodName = getPaymentMethodName();
        var poValue = input.val().trim();
        if(!poValue) {
            throw "You must enter a PO# to use the '"+paymentMethodName+"' payment method.";
        }

        if(poValue.length < minimumPoNumberLength) {
            throw "The PO# must be at least "+minimumPoNumberLength+' characters long.';
        }

        return true;
    }

    function onPoNumberInputChange() {
        //console.log("PO# change:", input.val());

        updatePoNumberInOrderComments();
    }

    function getPaymentMethodName() {
        return getFormLabelElement().text().trim();
    }

    function getFormLabelElement() {
        return $('label[for="checkout_provider_checkout_'+paymentMethodToAttachTo+'"]');
    }

    function getFormInputElement() {
        return $('#checkout_provider_checkout_'+paymentMethodToAttachTo);
    }

    function _isPaymentMethodAllowed() {
        var customerGroupName = $('#current-customer-group-name').html();

        if(customerGroupName.indexOf(allowedGroupName) !== -1) {
            return true;
        }

        return false;
    }

    function isPaymentMethodAllowed() {
        var methodIsAllowed = false;
        
        try {
            methodIsAllowed = _isPaymentMethodAllowed();
        } catch(e) {
            console.log("Exception when trying to validate payment method availability", e);
        }

        return methodIsAllowed;
    }

    function removePaymentMethod() {
        getFormInputElement().remove();
        getFormLabelElement().remove();

        $('#provider_list br+br').remove(); // Clean up double <br/> tags that mess with layout.
    }

    function enforceConditionalVisibility() {
        _onCheckoutConfirmationStepLoaded = function(){
        	console.log("Removing method.");
        	removePaymentMethod();
        	selectFirstAvailablePaymentMethod();
        }
    }

    function selectFirstAvailablePaymentMethod() {
    	$('input[name="checkout_provider"]').first().click();
    }

    // SE Code adapted from https://stackoverflow.com/a/31618857/884734
    function hookFunction(object, functionName, callback) {
        (function(originalFunction) {
            object[functionName] = function () {
                var returnValue = originalFunction.apply(this, arguments);

                var overrideValue = callback.apply(this, [returnValue, originalFunction, arguments]);

                if(overrideValue !== undefined) {
                    return overrideValue;
                }

                return returnValue;
            };

            object[functionName].isHooked = true;
        }(object[functionName]));
    }

}());