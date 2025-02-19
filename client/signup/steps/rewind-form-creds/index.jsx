import { Card } from '@automattic/components';
import { localize } from 'i18n-calypso';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import FormattedHeader from 'calypso/components/formatted-header';
import RewindCredentialsForm from 'calypso/components/rewind-credentials-form';
import StepWrapper from 'calypso/signup/step-wrapper';
import getRewindState from 'calypso/state/selectors/get-rewind-state';
import { submitSignupStep } from 'calypso/state/signup/progress/actions';
import './style.scss';

class RewindFormCreds extends Component {
	static propTypes = {
		flowName: PropTypes.string,
		goToNextStep: PropTypes.func.isRequired,
		positionInFlow: PropTypes.number,
		stepName: PropTypes.string,

		// Connected props
		siteId: PropTypes.number.isRequired,
		rewindIsNowActive: PropTypes.bool.isRequired,
	};

	/**
	 * Before component updates, check if credentials were correctly saved and go to next step.
	 */
	componentDidUpdate() {
		if ( this.props.rewindIsNowActive ) {
			this.props.submitSignupStep( { stepName: this.props.stepName }, { rewindconfig: true } );
			this.props.goToNextStep();
		}
	}

	/**
	 * Don't update the component if the Rewind state is the same.
	 *
	 * @param {Object} nextProps Props received by component for next update.
	 * @returns {boolean} False if the Rewind state is the same.
	 */
	shouldComponentUpdate( nextProps ) {
		return this.props.rewindIsNowActive !== nextProps.rewindIsNowActive;
	}

	stepContent() {
		const { translate, siteId } = this.props;

		return (
			<Fragment>
				<FormattedHeader
					headerText={ translate( 'Site credentials' ) }
					subHeaderText={ translate(
						"We'll guide you through the process of finding and entering your site's credentials."
					) }
				/>
				<Card className="rewind-form-creds__card rewind-switch__card rewind-switch__content">
					<Card compact className="rewind-form-creds__legend">
						{ translate( 'Enter your credentials' ) }
					</Card>
					<RewindCredentialsForm role="main" siteId={ siteId } allowCancel={ false } />
				</Card>
				,
			</Fragment>
		);
	}

	render() {
		return (
			<StepWrapper
				flowName={ this.props.flowName }
				stepName={ this.props.stepName }
				positionInFlow={ this.props.positionInFlow }
				stepContent={ this.stepContent() }
				hideFormattedHeader={ true }
				hideSkip={ true }
				hideBack={ false }
			/>
		);
	}
}

export default connect(
	( state, ownProps ) => {
		const siteId = parseInt( get( ownProps, [ 'initialContext', 'query', 'siteId' ], 0 ) );
		const rewindState = getRewindState( state, siteId );
		return {
			siteId,
			rewindIsNowActive: [ 'active', 'provisioning' ].includes( rewindState.state ),
		};
	},
	{ submitSignupStep }
)( localize( RewindFormCreds ) );
