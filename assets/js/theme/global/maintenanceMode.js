import $ from 'jquery';

/**
 * Show the maintenance mode message to store administrators
 * @param maintenanceMode
 */
export default function (maintenanceMode = {}) {
    const header = maintenanceMode.header;
    const notice = maintenanceMode.notice;
    const password = maintenanceMode.password;

    if (!(header && notice)) {
        return;
    }

    if (password) {
        const securePath = maintenanceMode.secure_path;
        const $element = $('<div>', {
            class: 'adminBar',
        });

        $element.html(`<div class="adminBarLogo" id="adminBarLogo">
            <a href="${securePath}/manage/dashboard"><svg><use xlink:href="#logo-small"></use></svg></a></div>
            <div class="adminBarContent">
            <a href="${securePath}/manage/theme-editor" target="_blank">Customize Theme</a>
            <span class="passcode">Share your site with passcode: <a href ="#">${password}</a></span>
            <span>Your storefront is private.</span>
            </div>`);
        $('body').prepend($element);
    } else {
        const $element = $('<div>', {
            id: 'maintenance-notice',
            class: 'maintenanceNotice',
        });


        $element.html(`<p class="maintenanceNotice-header">${header}</p>${notice}`);

        $('body').append($element);
    }
}
