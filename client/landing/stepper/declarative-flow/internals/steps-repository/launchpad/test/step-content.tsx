/**
 * @jest-environment jsdom
 */
import { DESIGN_FIRST_FLOW, NEWSLETTER_FLOW, START_WRITING_FLOW } from '@automattic/onboarding';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import nock from 'nock';
import React from 'react';
import { Provider } from 'react-redux';
import { createReduxStore } from 'calypso/state';
import { getInitialState, getStateFromCache } from 'calypso/state/initial-state';
import initialReducer from 'calypso/state/reducer';
import { setStore } from 'calypso/state/redux-store';
import StepContent from '../step-content';
import { defaultSiteDetails, buildDomainResponse } from './lib/fixtures';

const mockSite = {
	...defaultSiteDetails,
	options: {
		...defaultSiteDetails.options,
		site_intent: '',
	},
};

const siteSlug = 'testlinkinbio.wordpress.com';

const stepContentProps = {
	siteSlug,
	/* eslint-disable @typescript-eslint/no-empty-function */
	submit: () => {},
	goNext: () => {},
	goToStep: () => {},
	/* eslint-enable @typescript-eslint/no-empty-function */
};

// completionStatuses is defined here so we can change it dynamically in tests
// feel free to add more attributes as needed
const completionStatuses = {
	'design-first': {
		plan_completed: false,
	},
	'start-writing': {
		plan_completed: false,
	},
};

jest.mock( '@automattic/data-stores/src/plugins', () => ( {
	registerPlugins: jest.fn(),
} ) );

jest.mock( '@wordpress/data', () => {
	return {
		createRegistrySelector: jest.fn(),
		registerStore: jest.fn(),
		combineReducers: jest.fn(),
		createReduxStore: jest.fn(),
		register: jest.fn(),
		useSelect: jest.fn().mockImplementation( ( selectFunc ) => {
			const select = ( storeName ) => {
				if ( storeName === 'automattic/onboard' ) {
					return {
						getPlanCartItem: () => [ { product_slug: 'value_bundle' } ],
						getDomainCartItem: () => [
							{
								is_free: false,
								product_slug: 'mydomain.com',
							},
						],
						getSelectedDomain: () => ( {
							is_free: false,
							product_slug: 'mydomain.com',
						} ),
					};
				}

				if ( storeName === 'automattic/site' ) {
					return {
						getSiteOption: () => 'https://example.wordpress.com/wp-admin',
					};
				}
			};

			return selectFunc( select );
		} ),
	};
} );

jest.mock( 'calypso/landing/stepper/hooks/use-site', () => ( {
	useSite: () => mockSite,
} ) );

jest.mock( 'react-router-dom', () => ( {
	...( jest.requireActual( 'react-router-dom' ) as object ),
	useLocation: jest.fn().mockImplementation( () => ( {
		pathname: '/setup/launchpad',
		search: `?flow=newsletter&siteSlug=testlinkinbio.wordpress.com`,
		hash: '',
		state: undefined,
	} ) ),
} ) );

jest.mock( '@automattic/data-stores', () => ( {
	...( jest.requireActual( '@automattic/data-stores' ) as object ),
	useLaunchpad: ( siteSlug, siteIntentOption ): LaunchpadResponse => {
		let checklist = [];

		switch ( siteIntentOption ) {
			case 'newsletter':
				checklist = [
					{
						id: 'setup_newsletter',
						completed: true,
						disabled: false,
						title: 'Personalize newsletter',
					},
					{ id: 'plan_selected', completed: true, disabled: false, title: 'Choose a plan' },
					{ id: 'subscribers_added', completed: true, disabled: true, title: 'Add subscribers' },
					{
						id: 'verify_email',
						completed: true,
						disabled: true,
						title: 'Confirm email (check your inbox)',
					},
					{
						id: 'first_post_published_newsletter',
						completed: true,
						disabled: true,
						title: 'Start writing',
					},
				];
				break;

			case 'start-writing':
				checklist = [
					{
						id: 'first_post_published',
						completed: false,
						disabled: false,
						title: 'Write your first post',
					},
					{ id: 'setup_blog', completed: false, disabled: false, title: 'Name your blog' },
					{ id: 'domain_upsell', completed: false, disabled: false, title: 'Choose a domain' },
					{
						id: 'plan_completed',
						completed: completionStatuses[ 'start-writing' ][ 'plan_completed' ],
						disabled: false,
						title: 'Choose a plan',
					},
					{
						id: 'blog_launched',
						completed: false,
						disabled: false,
						title: 'Launch your blog',
					},
				];
				break;

			case 'design-first':
				checklist = [
					{ id: 'design_selected', completed: false, disabled: false, title: 'Select a design' },
					{ id: 'setup_blog', completed: false, disabled: false, title: 'Name your blog' },
					{ id: 'domain_upsell', completed: false, disabled: false, title: 'Choose a domain' },
					{
						id: 'plan_completed',
						completed: completionStatuses[ 'design-first' ][ 'plan_completed' ],
						disabled: false,
						title: 'Choose a plan',
					},
					{
						id: 'first_post_published',
						completed: false,
						disabled: false,
						title: 'Write your first post',
					},
					{
						id: 'blog_launched',
						completed: false,
						disabled: false,
						title: 'Launch your blog',
					},
				];
				break;
		}

		return {
			data: {
				site_intent: siteIntentOption,
				checklist,
			},
			isFetchedAfterMount: true,
		};
	},
} ) );

const user = {
	ID: 1234,
	username: 'testUser',
	email: 'testemail@wordpress.com',
	email_verified: false,
};

function renderStepContent( emailVerified = false, flow: string ) {
	const initialState = getInitialState( initialReducer, user.ID );
	const reduxStore = createReduxStore(
		{
			...initialState,
			currentUser: {
				user: {
					...user,
					email_verified: emailVerified,
				},
			},
		},
		initialReducer
	);
	setStore( reduxStore, getStateFromCache( user.ID ) );
	const queryClient = new QueryClient();

	render(
		<Provider store={ reduxStore }>
			<QueryClientProvider client={ queryClient }>
				<StepContent { ...stepContentProps } flow={ flow } />
			</QueryClientProvider>
		</Provider>
	);
}

describe( 'StepContent', () => {
	beforeEach( () => {
		nock( 'https://public-api.wordpress.com' )
			.get( `/wpcom/v2/sites/${ siteSlug }/launchpad` )
			.reply( 200, {
				checklist_statuses: {},
				launchpad_screen: 'full',
				site_intent: '',
			} );
		nock( 'https://public-api.wordpress.com' )
			.get( `/rest/v1.2/sites/211078228/domains` )
			.reply(
				200,
				buildDomainResponse( {
					sslStatus: null,
					isWPCOMDomain: true,
				} )
			);
		nock( 'https://public-api.wordpress.com' )
			.get( `/wpcom/v2/sites/211078228/memberships/status?source=launchpad` )
			.reply( 200, {
				connect_url: 'https://connect.stripe.com',
				connected_account_default_currency: '',
				connected_account_description: '',
				connected_account_id: '',
			} );
	} );

	afterEach( () => {
		nock.cleanAll();
	} );

	// To get things started, test basic rendering for Newsletter flow
	// In future, we can add additional flows and test interactivity of items
	describe( 'when flow is Newsletter', () => {
		beforeEach( () => {
			mockSite.options.site_intent = NEWSLETTER_FLOW;
		} );
		it( 'renders correct sidebar header content', () => {
			renderStepContent( false, NEWSLETTER_FLOW );

			expect( screen.getByText( 'Newsletter' ) ).toBeInTheDocument();
			expect( screen.getByText( "Your newsletter's ready!" ) ).toBeInTheDocument();
			expect( screen.getByText( 'Now it’s time to let your readers know.' ) ).toBeInTheDocument();
		} );

		it( 'renders correct sidebar tasks', () => {
			renderStepContent( false, NEWSLETTER_FLOW );

			expect( screen.getByText( 'Personalize newsletter' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Choose a plan' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Add subscribers' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Confirm email (check your inbox)' ) ).toBeInTheDocument();
			expect( screen.getByRole( 'button', { name: 'Start writing' } ) ).toBeInTheDocument();
		} );

		it( 'renders correct status for each task', () => {
			renderStepContent( false, NEWSLETTER_FLOW );

			const personalizeListItem = screen.getByText( 'Personalize newsletter' ).closest( 'li' );
			const choosePlanListItem = screen.getByText( 'Choose a plan' ).closest( 'li' );
			const addSubscribersListItem = screen.getByText( 'Add subscribers' ).closest( 'li' );
			const confirmEmailListItem = screen
				.getByText( 'Confirm email (check your inbox)' )
				.closest( 'li' );
			const firstPostListItem = screen
				.getByRole( 'button', { name: 'Start writing' } )
				.closest( 'li' );

			expect( personalizeListItem ).toHaveClass( 'completed' );
			expect( choosePlanListItem ).toHaveClass( 'completed' );
			expect( addSubscribersListItem ).toHaveClass( 'completed' );
			expect( confirmEmailListItem ).toHaveClass( 'pending' );
			expect( firstPostListItem ).toHaveClass( 'completed' );
		} );

		it( 'renders web preview section', () => {
			renderStepContent( false, NEWSLETTER_FLOW );

			expect( screen.getByTitle( 'Preview' ) ).toBeInTheDocument();
		} );
	} );

	describe( 'when flow is Start writing', () => {
		beforeEach( () => {
			mockSite.options.site_intent = START_WRITING_FLOW;
		} );
		it( 'renders correct sidebar header content', () => {
			renderStepContent( false, START_WRITING_FLOW );

			expect( screen.getByText( "Your blog's almost ready!" ) ).toBeInTheDocument();
			expect(
				screen.getByText( 'Keep up the momentum with these final steps.' )
			).toBeInTheDocument();
		} );

		it( 'renders correct sidebar tasks', () => {
			renderStepContent( false, START_WRITING_FLOW );

			expect( screen.getByText( 'Write your first post' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Name your blog' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Choose a domain' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Choose a plan' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Launch your blog' ) ).toBeInTheDocument();
		} );

		it( 'renders correct status for each task', () => {
			renderStepContent( false, START_WRITING_FLOW );

			const setupBlogListItem = screen.getByText( 'Name your blog' ).closest( 'li' );
			expect( setupBlogListItem ).toHaveClass( 'pending' );

			const choosePlanListItem = screen.getByText( 'Choose a plan' ).closest( 'li' );
			expect( choosePlanListItem ).toHaveClass( 'pending' );
		} );

		it( 'renders web preview section', () => {
			renderStepContent( false, START_WRITING_FLOW );

			expect( screen.getByTitle( 'Preview' ) ).toBeInTheDocument();
		} );

		it( 'renders correct launch CTA text when plan not free', () => {
			completionStatuses[ 'start-writing' ][ 'plan_completed' ] = true;
			renderStepContent( false, START_WRITING_FLOW );

			expect( screen.getByText( 'Checkout and launch' ) ).toBeInTheDocument();
			completionStatuses[ 'start-writing' ][ 'plan_completed' ] = false;
		} );
	} );

	describe( 'when flow is Design first', () => {
		beforeEach( () => {
			mockSite.options.site_intent = DESIGN_FIRST_FLOW;
		} );
		it( 'renders correct sidebar header content', () => {
			renderStepContent( false, DESIGN_FIRST_FLOW );

			expect( screen.getByText( "Your blog's almost ready!" ) ).toBeInTheDocument();
			expect(
				screen.getByText( 'Keep up the momentum with these final steps.' )
			).toBeInTheDocument();
		} );

		it( 'renders correct sidebar tasks', () => {
			renderStepContent( false, START_WRITING_FLOW );

			expect( screen.getByText( 'Select a design' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Name your blog' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Choose a domain' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Choose a plan' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Write your first post' ) ).toBeInTheDocument();
			expect( screen.getByText( 'Launch your blog' ) ).toBeInTheDocument();
		} );

		it( 'renders correct status for each task', () => {
			renderStepContent( false, DESIGN_FIRST_FLOW );

			const setupBlogListItem = screen.getByText( 'Name your blog' ).closest( 'li' );
			expect( setupBlogListItem ).toHaveClass( 'pending' );

			const choosePlanListItem = screen.getByText( 'Choose a plan' ).closest( 'li' );
			expect( choosePlanListItem ).toHaveClass( 'pending' );
		} );

		it( 'renders web preview section', () => {
			renderStepContent( false, DESIGN_FIRST_FLOW );

			expect( screen.getByTitle( 'Preview' ) ).toBeInTheDocument();
		} );

		it( 'renders correct launch CTA text when plan not free', () => {
			completionStatuses[ 'design-first' ][ 'plan_completed' ] = true;
			renderStepContent( false, DESIGN_FIRST_FLOW );

			expect( screen.getByText( 'Checkout and launch' ) ).toBeInTheDocument();
			completionStatuses[ 'design-first' ][ 'plan_completed' ] = false;
		} );
	} );
} );
