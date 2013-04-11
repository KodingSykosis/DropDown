(function($) {
    $(function() {
        $('#mainform').validate({
            rules: {
                UserName: 'required',
                Password: 'required',
                PasswordConfirm: {
                    equalTo: '#Password'
                },
                Email: {
                    required: true,
                    email: true
                },
                City: 'required',
                State: 'required',
                Zip: {
                    required: true,
                    number: true
                }
            },
            messages: {
                PasswordConfirm: {
                    equalTo: 'Passwords do not match'
                }
            }
        });
        

        $('.dropdown').DropDown({
            allowEmpty: true
        });
    });
})(jQuery);