import { localizeUrl } from '@automattic/i18n-utils';
import { localize } from 'i18n-calypso';
import PropTypes from 'prop-types';
import { createRef, Component } from 'react';
import { connect } from 'react-redux';
import FormButton from 'calypso/components/forms/form-button';
import FormFieldset from 'calypso/components/forms/form-fieldset';
import FormLabel from 'calypso/components/forms/form-label';
import FormTextInput from 'calypso/components/forms/form-text-input';
import LoggedOutForm from 'calypso/components/logged-out-form';
import Notice from 'calypso/components/notice';
import { recordTracksEventWithClientId as recordTracksEvent } from 'calypso/state/analytics/actions';
import { sendEmailLogin } from 'calypso/state/auth/actions';
import { getCurrentUser } from 'calypso/state/current-user/selectors';
import { hideMagicLoginRequestNotice } from 'calypso/state/login/magic-login/actions';
import { CHECK_YOUR_EMAIL_PAGE } from 'calypso/state/login/magic-login/constants';
import {
	getRedirectToOriginal,
	getLastCheckedUsernameOrEmail,
} from 'calypso/state/login/selectors';
import getCurrentQueryArguments from 'calypso/state/selectors/get-current-query-arguments';
import getInitialQueryArguments from 'calypso/state/selectors/get-initial-query-arguments';
import getMagicLoginCurrentView from 'calypso/state/selectors/get-magic-login-current-view';
import getMagicLoginRequestEmailError from 'calypso/state/selectors/get-magic-login-request-email-error';
import getMagicLoginRequestedEmailSuccessfully from 'calypso/state/selectors/get-magic-login-requested-email-successfully';
import isFetchingMagicLoginEmail from 'calypso/state/selectors/is-fetching-magic-login-email';
import EmailedLoginLinkSuccessfully from './emailed-login-link-successfully';
import EmailedLoginLinkSuccessfullyJetpackConnect from './emailed-login-link-successfully-jetpack-connect';

class RequestLoginEmailForm extends Component {
	static propTypes = {
		// mapped to state
		currentUser: PropTypes.object,
		emailRequested: PropTypes.bool,
		isFetching: PropTypes.bool,
		isJetpackMagicLinkSignUpEnabled: PropTypes.bool,
		redirectTo: PropTypes.string,
		requestError: PropTypes.string,
		showCheckYourEmail: PropTypes.bool,
		userEmail: PropTypes.string,
		flow: PropTypes.string,

		// mapped to dispatch
		sendEmailLogin: PropTypes.func.isRequired,
		hideMagicLoginRequestNotice: PropTypes.func.isRequired,

		showTos: PropTypes.bool,
		headerText: PropTypes.string,
		subHeaderText: PropTypes.string,
		inputPlaceholder: PropTypes.string,
		submitButtonLabel: PropTypes.string,
		onSendEmailLogin: PropTypes.func,
		createAccountForNewUser: PropTypes.bool,
	};

	state = {
		usernameOrEmail: this.props.userEmail || '',
	};

	usernameOrEmailRef = createRef();

	componentDidUpdate( prevProps ) {
		if ( ! prevProps.requestError && this.props.requestError ) {
			this.usernameOrEmailRef.current?.focus();
		}
	}

	onUsernameOrEmailFieldChange = ( event ) => {
		this.setState( {
			usernameOrEmail: event.target.value,
		} );

		if ( this.props.requestError ) {
			this.props.hideMagicLoginRequestNotice();
		}
	};

	onNoticeDismiss = () => {
		this.props.hideMagicLoginRequestNotice();
	};

	onSubmit = ( event ) => {
		event.preventDefault();

		const usernameOrEmail = this.getUsernameOrEmailFromState();

		if ( ! usernameOrEmail.length ) {
			return;
		}

		this.props.onSendEmailLogin?.( usernameOrEmail );

		this.props.sendEmailLogin( usernameOrEmail, {
			redirectTo: this.props.redirectTo,
			requestLoginEmailFormFlow: true,
			createAccount: this.props.createAccountForNewUser,
			...( this.props.flow ? { flow: this.props.flow } : {} ),
		} );
	};

	getUsernameOrEmailFromState() {
		return this.state.usernameOrEmail;
	}

	render() {
		const {
			currentUser,
			requestError,
			isFetching,
			isJetpackMagicLinkSignUpEnabled,
			emailRequested,
			showCheckYourEmail,
			translate,
			showTos,
			headerText,
			subHeaderText,
			inputPlaceholder,
			submitButtonLabel,
		} = this.props;

		const usernameOrEmail = this.getUsernameOrEmailFromState();

		if ( showCheckYourEmail ) {
			const emailAddress = usernameOrEmail.indexOf( '@' ) > 0 ? usernameOrEmail : null;

			return isJetpackMagicLinkSignUpEnabled ? (
				<EmailedLoginLinkSuccessfullyJetpackConnect emailAddress={ emailAddress } />
			) : (
				<EmailedLoginLinkSuccessfully emailAddress={ emailAddress } />
			);
		}

		const submitEnabled =
			usernameOrEmail.length && ! isFetching && ! emailRequested && ! requestError;

		const errorText =
			typeof requestError === 'string' && requestError.length
				? requestError
				: translate( 'Unable to complete request' );

		const tos = (
			<div className="magic-login__tos">
				{ this.props.translate(
					'By entering your email address, you agree to our {{tosLink}}Terms of Service{{/tosLink}} and have read our {{privacyLink}}Privacy Policy{{/privacyLink}}.',
					{
						components: {
							tosLink: (
								<a
									href={ localizeUrl( 'https://wordpress.com/tos/' ) }
									target="_blank"
									rel="noopener noreferrer"
								/>
							),
							privacyLink: (
								<a
									href={ localizeUrl( 'https://automattic.com/privacy/' ) }
									target="_blank"
									rel="noopener noreferrer"
								/>
							),
						},
					}
				) }
			</div>
		);

		return (
			<div className="magic-login__form">
				<h1 className="magic-login__form-header">
					{ headerText || translate( 'Email me a login link' ) }
				</h1>
				{ requestError && (
					<Notice
						duration={ 10000 }
						text={ errorText }
						className="magic-login__request-login-email-form-notice"
						showDismiss={ true }
						onDismissClick={ this.onNoticeDismiss }
						status="is-error"
					/>
				) }
				{ currentUser && currentUser.username && (
					<p>
						{ translate( 'NOTE: You are already logged in as user: %(user)s', {
							args: {
								user: currentUser.username,
							},
						} ) }
					</p>
				) }
				<LoggedOutForm onSubmit={ this.onSubmit }>
					<p className="magic-login__form-sub-header">
						{ subHeaderText ||
							translate(
								'Get a link sent to the email address associated with your account to log in instantly without your password.'
							) }
					</p>
					<FormLabel htmlFor="usernameOrEmail">
						{ this.props.translate( 'Email Address or Username' ) }
					</FormLabel>
					<FormFieldset className="magic-login__email-fields">
						<FormTextInput
							autoCapitalize="off"
							autoFocus // eslint-disable-line jsx-a11y/no-autofocus
							disabled={ isFetching || emailRequested }
							value={ usernameOrEmail }
							name="usernameOrEmail"
							ref={ this.usernameOrEmailRef }
							onChange={ this.onUsernameOrEmailFieldChange }
							placeholder={ inputPlaceholder }
						/>
						{ showTos && tos }
						<div className="magic-login__form-action">
							<FormButton primary disabled={ ! submitEnabled }>
								{ submitButtonLabel || translate( 'Get Link' ) }
							</FormButton>
						</div>
					</FormFieldset>
				</LoggedOutForm>
			</div>
		);
	}
}

const mapState = ( state ) => {
	return {
		currentUser: getCurrentUser( state ),
		isFetching: isFetchingMagicLoginEmail( state ),
		redirectTo: getRedirectToOriginal( state ),
		requestError: getMagicLoginRequestEmailError( state ),
		showCheckYourEmail: getMagicLoginCurrentView( state ) === CHECK_YOUR_EMAIL_PAGE,
		emailRequested: getMagicLoginRequestedEmailSuccessfully( state ),
		userEmail:
			getLastCheckedUsernameOrEmail( state ) ||
			getCurrentQueryArguments( state ).email_address ||
			getInitialQueryArguments( state ).email_address,
	};
};

const mapDispatch = {
	sendEmailLogin,
	hideMagicLoginRequestNotice,
	recordTracksEvent,
};

export default connect( mapState, mapDispatch )( localize( RequestLoginEmailForm ) );
