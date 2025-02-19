/**
 * @jest-environment jsdom
 */
import { SiteDetails } from '@automattic/data-stores';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { useSiteMigrateInfo } from 'calypso/blocks/importer/hooks/use-site-can-migrate';
import { createReduxStore } from 'calypso/state';
import { getInitialState, getStateFromCache } from 'calypso/state/initial-state';
import initialReducer from 'calypso/state/reducer';
import { setStore } from 'calypso/state/redux-store';
import isRequestingSiteCredentials from 'calypso/state/selectors/is-requesting-site-credentials';
import PreMigration from '../index';

const user = {
	ID: 1234,
	username: 'testUser',
	email: 'testemail@wordpress.com',
	email_verified: false,
};

const sourceSite: Partial< SiteDetails > = {
	ID: 777712,
	slug: 'self-hosted.example.com',
	URL: 'https://self-hosted.example.com',
};

const targetSite: Partial< SiteDetails > = {
	ID: 9123123,
	URL: 'https://example_test.wordpress.com',
};

const onContentOnlyClick = jest.fn();

jest.mock( 'react-router-dom', () => ( {
	...( jest.requireActual( 'react-router-dom' ) as object ),
	useLocation: jest.fn().mockImplementation( () => ( {
		pathname: '/setup/import-focused/importerWordpress',
		search: `?from=${ sourceSite.URL }&siteSlug=${ targetSite.URL }&option=everything`,
		hash: '',
		state: undefined,
	} ) ),
} ) );

jest.mock( 'calypso/blocks/importer/hooks/use-site-can-migrate' );
jest.mock( 'calypso/state/selectors/is-requesting-site-credentials' );

function renderPreMigrationScreen( props?: any ) {
	const initialState = getInitialState( initialReducer, user.ID );
	const reduxStore = createReduxStore(
		{
			...initialState,
			currentUser: {
				user: {
					...user,
				},
			},
		},
		initialReducer
	);

	setStore( reduxStore, getStateFromCache( user.ID ) );
	const queryClient = new QueryClient();

	return render(
		<Provider store={ reduxStore }>
			<QueryClientProvider client={ queryClient }>
				<PreMigration { ...props } />
			</QueryClientProvider>
		</Provider>
	);
}

describe( 'PreMigration', () => {
	beforeEach( () => {
		jest.clearAllMocks();
	} );

	test( 'should show Upgrade plan screen', () => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		useSiteMigrateInfo.mockReturnValue( {
			sourceSiteId: 777712,
			sourceSite: sourceSite as SiteDetails,
			fetchMigrationEnabledStatus: jest.fn(),
			isFetchingData: false,
			siteCanMigrate: true,
		} );

		renderPreMigrationScreen( {
			targetSite: targetSite,
			isTargetSitePlanCompatible: false,
			isMigrateFromWp: true,
			onContentOnlyClick,
		} );

		expect( screen.getByText( 'Upgrade your plan' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Upgrade and migrate' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Use the content-only import option' ) ).toBeInTheDocument();

		// Click on "Use the content-only import option"
		const button = screen.getByText( 'Use the content-only import option' );
		fireEvent.click( button );
		expect( onContentOnlyClick ).toHaveBeenCalled();
	} );

	test( 'should show "Move to wordpress.com" plugin update', () => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		useSiteMigrateInfo.mockImplementationOnce( () => ( {
			sourceSiteId: 777712,
			sourceSite: sourceSite as SiteDetails,
			fetchMigrationEnabledStatus: jest.fn(),
			isFetchingData: false,
			siteCanMigrate: false,
		} ) );

		renderPreMigrationScreen( {
			targetSite: targetSite,
			isTargetSitePlanCompatible: false,
			isMigrateFromWp: true,
			onContentOnlyClick,
		} );

		expect( screen.getByText( 'Update ‘Move to WordPress.com’' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Update plugin' ) ).toBeInTheDocument();
	} );

	test( 'should show "Jetpack" plugin update', () => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		useSiteMigrateInfo.mockImplementationOnce( () => ( {
			sourceSiteId: 777712,
			sourceSite: sourceSite as SiteDetails,
			fetchMigrationEnabledStatus: jest.fn(),
			isFetchingData: false,
			siteCanMigrate: false,
		} ) );

		renderPreMigrationScreen( {
			targetSite: targetSite,
			isTargetSitePlanCompatible: false,
			isMigrateFromWp: false,
			onContentOnlyClick,
		} );

		expect( screen.getAllByText( 'Install Jetpack' ).at( 0 ) ).toBeInTheDocument();
		expect( screen.getByText( 'Jetpack required' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Install Jetpack manually' ) ).toBeInTheDocument();
	} );

	test( 'should show migration ready screen', async () => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		useSiteMigrateInfo.mockReturnValue( {
			sourceSiteId: 777712,
			sourceSite: sourceSite as SiteDetails,
			fetchMigrationEnabledStatus: jest.fn(),
			isFetchingData: false,
			siteCanMigrate: true,
		} );

		renderPreMigrationScreen( {
			targetSite: targetSite,
			isTargetSitePlanCompatible: true,
			isMigrateFromWp: true,
			onContentOnlyClick,
		} );
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		isRequestingSiteCredentials.mockReturnValue( false );

		expect( screen.getByText( 'You are ready to migrate' ) ).toBeInTheDocument();

		const provideCredentialsBtn = screen.getByText( 'Provide the server credentials' );
		expect( provideCredentialsBtn ).toBeInTheDocument();

		fireEvent.click( screen.getByText( 'Start migration' ) );
		const confirmModal = await screen.findByText( 'Confirm your choice' );
		expect( confirmModal ).toBeInTheDocument();

		fireEvent.click( screen.getByText( 'Cancel' ) );
		expect( confirmModal ).not.toBeInTheDocument();

		fireEvent.click( provideCredentialsBtn );
		expect( screen.getByText( 'Do you need help locating your credentials?' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Start migration' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Skip credentials (slower setup)' ) ).toBeInTheDocument();

		const hostAddressInput = document.getElementById( 'host-address' ) as HTMLInputElement;
		expect( hostAddressInput.value ).toBe( sourceSite.slug );

		fireEvent.click( screen.getByText( 'Start migration' ) );
		expect( screen.getByText( 'Confirm your choice' ) ).toBeInTheDocument();
		fireEvent.click( screen.getByText( 'Continue' ) );
		expect(
			screen.getByText( 'Please make sure all fields are filled in correctly before proceeding.' )
		).toBeInTheDocument();
	} );
} );
