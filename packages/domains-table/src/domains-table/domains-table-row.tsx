import { LoadingPlaceholder } from '@automattic/components';
import {
	DomainUpdateStatus,
	PartialDomainData,
	SiteDomainsQueryFnData,
	useSiteDomainsQuery,
	useSiteQuery,
	SiteDetails,
} from '@automattic/data-stores';
import { CheckboxControl } from '@wordpress/components';
import { sprintf } from '@wordpress/i18n';
import { useI18n } from '@wordpress/react-i18n';
import { useTranslate } from 'i18n-calypso';
import { useEffect, useMemo, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { PrimaryDomainLabel } from '../primary-domain-label';
import { countDomainsRequiringAttention } from '../utils';
import { createSiteDomainObject } from '../utils/assembler';
import { domainManagementLink } from '../utils/paths';
import { DomainStatusPurchaseActions, resolveDomainStatus } from '../utils/resolve-domain-status';
import { DomainsTableRegisteredUntilCell } from './domains-table-registered-until-cell';
import { DomainsTableRowActions } from './domains-table-row-actions';
import { DomainsTableSiteCell } from './domains-table-site-cell';
import { DomainsTableStatusCell } from './domains-table-status-cell';

interface DomainsTableRowProps {
	domain: PartialDomainData;
	isAllSitesView: boolean;
	isSelected: boolean;
	hideOwnerColumn?: boolean;
	onSelect( domain: PartialDomainData ): void;
	domainStatusPurchaseActions?: DomainStatusPurchaseActions;
	onDomainsRequiringAttentionChange?( domainsRequiringAttention: number ): void;
	fetchSiteDomains?: (
		siteIdOrSlug: number | string | null | undefined
	) => Promise< SiteDomainsQueryFnData >;
	fetchSite?: ( siteIdOrSlug: number | string | null | undefined ) => Promise< SiteDetails >;
	pendingUpdates: DomainUpdateStatus[];
}

export function DomainsTableRow( {
	domain,
	isAllSitesView,
	isSelected,
	hideOwnerColumn = false,
	onSelect,
	fetchSiteDomains,
	fetchSite,
	domainStatusPurchaseActions,
	onDomainsRequiringAttentionChange,
	pendingUpdates = [],
}: DomainsTableRowProps ) {
	const { __ } = useI18n();
	const translate = useTranslate();
	const { ref, inView } = useInView( { triggerOnce: true } );

	const { data: allSiteDomains, isLoading: isLoadingSiteDomainsDetails } = useSiteDomainsQuery(
		domain.blog_id,
		{
			enabled: inView,
			...( fetchSiteDomains && { queryFn: () => fetchSiteDomains( domain.blog_id ) } ),
			select: ( state ) => state.domains.map( createSiteDomainObject ),
		}
	);

	const currentDomainData = useMemo( () => {
		return allSiteDomains?.find( ( d ) => d.name === domain.domain );
	}, [ allSiteDomains, domain.domain ] );

	const isPrimaryDomain = useMemo(
		() => allSiteDomains?.find( ( d ) => d.isPrimary )?.name === domain.domain,
		[ allSiteDomains, domain.domain ]
	);

	const { data: site, isLoading: isLoadingSiteDetails } = useSiteQuery( domain.blog_id, {
		enabled: inView,
		...( fetchSite && { queryFn: () => fetchSite( domain.blog_id ) } ),
	} );

	const siteSlug = useMemo( () => {
		if ( ! site?.URL ) {
			// Fall back to the site's ID if we're still loading detailed site data
			return domain.blog_id.toString( 10 );
		}

		if ( site.options.is_redirect && site.options.unmapped_url ) {
			return new URL( site.options.unmapped_url ).host;
		}

		return new URL( site.URL ).host.replace( /\//g, '::' );
	}, [ site, domain.blog_id ] );

	const isLoadingRowDetails = isLoadingSiteDetails || isLoadingSiteDomainsDetails;

	const domainsRequiringAttention = useMemo( () => {
		if ( ! currentDomainData || isLoadingRowDetails ) {
			return null;
		}
		return countDomainsRequiringAttention(
			allSiteDomains?.map( ( domain ) =>
				resolveDomainStatus( domain, {
					siteSlug: siteSlug,
					getMappingErrors: true,
					translate,
					isPurchasedDomain: domainStatusPurchaseActions?.isPurchasedDomain?.( currentDomainData ),
					isCreditCardExpiring:
						domainStatusPurchaseActions?.isCreditCardExpiring?.( currentDomainData ),
				} )
			)
		);
	}, [
		allSiteDomains,
		currentDomainData,
		domainStatusPurchaseActions,
		siteSlug,
		translate,
		isLoadingRowDetails,
	] );

	useEffect( () => {
		if ( typeof domainsRequiringAttention === 'number' && domainsRequiringAttention > 0 ) {
			onDomainsRequiringAttentionChange?.( domainsRequiringAttention );
		}
	}, [ domainsRequiringAttention, onDomainsRequiringAttentionChange ] );

	const isManageableDomain = ! domain.wpcom_domain;
	const shouldDisplayPrimaryDomainLabel = ! isAllSitesView && isPrimaryDomain;

	const [ placeholderWidth ] = useState( () => {
		const MIN = 40;
		const MAX = 100;

		return Math.floor( Math.random() * ( MAX - MIN + 1 ) ) + MIN;
	} );

	const userCanAddSiteToDomain = currentDomainData?.currentUserCanCreateSiteFromDomainOnly ?? false;

	const renderSiteCell = () => {
		if ( site && currentDomainData ) {
			return (
				<DomainsTableSiteCell
					site={ site }
					siteSlug={ siteSlug }
					userCanAddSiteToDomain={ userCanAddSiteToDomain }
				/>
			);
		}

		if ( isLoadingRowDetails ) {
			return <LoadingPlaceholder style={ { width: `${ placeholderWidth }%` } } />;
		}

		return null;
	};

	return (
		<tr key={ domain.domain } ref={ ref }>
			<td>
				{ ! domain.wpcom_domain && (
					<CheckboxControl
						__nextHasNoMarginBottom
						checked={ isSelected }
						onChange={ () => onSelect( domain ) }
						/* translators: Label for a checkbox control that selects a domain name.*/
						aria-label={ sprintf( __( 'Tick box for %(domain)s', __i18n_text_domain__ ), {
							domain: domain.domain,
						} ) }
					/>
				) }
			</td>
			<td>
				{ shouldDisplayPrimaryDomainLabel && <PrimaryDomainLabel /> }
				{ isManageableDomain ? (
					<a
						className="domains-table__domain-name"
						href={ domainManagementLink( domain, siteSlug, isAllSitesView ) }
					>
						{ domain.domain }
					</a>
				) : (
					<span className="domains-table__domain-name">{ domain.domain }</span>
				) }
			</td>
			{ ! hideOwnerColumn && (
				<td>
					{ isLoadingSiteDetails || isLoadingSiteDomainsDetails ? (
						<LoadingPlaceholder style={ { width: `${ placeholderWidth }%` } } />
					) : (
						currentDomainData?.owner ?? '-'
					) }
				</td>
			) }
			<td>{ renderSiteCell() }</td>
			<td>
				{ isLoadingRowDetails ? (
					<LoadingPlaceholder style={ { width: `${ placeholderWidth }%` } } />
				) : (
					<DomainsTableStatusCell
						siteSlug={ siteSlug }
						currentDomainData={ currentDomainData }
						domainStatusPurchaseActions={ domainStatusPurchaseActions }
						pendingUpdates={ pendingUpdates }
					/>
				) }
			</td>
			<td>
				<DomainsTableRegisteredUntilCell domain={ domain } />
			</td>
			<td></td>
			<td className="domains-table-row__actions">
				<DomainsTableRowActions
					canConnectDomainToASite={ userCanAddSiteToDomain }
					siteSlug={ siteSlug }
					domainName={ domain.domain }
				/>
			</td>
		</tr>
	);
}
