import {
	isWpComFreePlan,
	isWpcomEnterpriseGridPlan,
	PLAN_BIENNIAL_PERIOD,
	PLAN_ANNUAL_PERIOD,
	PLAN_TRIENNIAL_PERIOD,
	PlanSlug,
	getPlanSlugForTermVariant,
	TERM_ANNUALLY,
	isWooExpressPlan,
} from '@automattic/calypso-products';
import { formatCurrency } from '@automattic/format-currency';
import styled from '@emotion/styled';
import { useTranslate } from 'i18n-calypso';
import { usePlansGridContext } from '../grid-context';

function usePerMonthDescription( { planSlug }: { planSlug: PlanSlug } ) {
	const translate = useTranslate();
	const { helpers, gridPlansIndex } = usePlansGridContext();
	const {
		isMonthlyPlan,
		pricing: { currencyCode, originalPrice, discountedPrice, billingPeriod, introOffer },
	} = gridPlansIndex[ planSlug ];

	if ( isWpComFreePlan( planSlug ) || isWpcomEnterpriseGridPlan( planSlug ) ) {
		return null;
	}

	// We want the yearly-variant plan's price to be the raw price the user
	// would pay if they choose an annual plan instead of the monthly one. So pro-rated
	// (or other) credits should not apply.
	const yearlyVariantPlanSlug =
		getPlanSlugForTermVariant( planSlug, TERM_ANNUALLY ) ?? ( '' as PlanSlug );
	const yearlyVariantPricing = helpers?.usePricingMetaForGridPlans( {
		planSlugs: [ yearlyVariantPlanSlug ],
		withoutProRatedCredits: true,
	} )?.[ yearlyVariantPlanSlug ];

	if ( isMonthlyPlan && originalPrice?.monthly && yearlyVariantPricing && ! introOffer ) {
		const yearlyVariantMaybeDiscountedPrice =
			yearlyVariantPricing.discountedPrice?.monthly || yearlyVariantPricing.originalPrice?.monthly;

		if (
			yearlyVariantMaybeDiscountedPrice &&
			yearlyVariantMaybeDiscountedPrice < originalPrice.monthly
		) {
			return translate( `Save %(discountRate)s%% by paying annually`, {
				args: {
					discountRate: Math.floor(
						( 100 * ( originalPrice.monthly - yearlyVariantMaybeDiscountedPrice ) ) /
							originalPrice.monthly
					),
				},
			} );
		}

		return null;
	}

	const discountedPriceFullTermText =
		currencyCode && discountedPrice?.full
			? formatCurrency( discountedPrice.full, currencyCode, { stripZeros: true } )
			: null;
	const originalPriceFullTermText =
		currencyCode && originalPrice?.full
			? formatCurrency( originalPrice.full, currencyCode, { stripZeros: true } )
			: null;

	/*
	 * The introOffer billing should fall below into the next block once experiment with Woo plans is finalized.
	 * We only expose introOffers to monthly & yearly plans for now (so no need to introduce more translations just yet).
	 */
	if ( introOffer?.intervalCount && introOffer.intervalUnit ) {
		if ( discountedPriceFullTermText ) {
			if ( isMonthlyPlan ) {
				return translate(
					'per month, for your first %(introOfferIntervalCount)s %(introOfferIntervalPeriod)s,{{br/}}' +
						'then, %(rawPrice)s for the first month, Excl. Taxes',
					'per month, for your first %(introOfferIntervalCount)s %(introOfferIntervalPeriod)ss,{{br/}}' +
						'then, %(rawPrice)s for the first month, Excl. Taxes',
					{
						count: introOffer.intervalCount,
						args: {
							rawPrice: discountedPriceFullTermText,
							introOfferIntervalCount: introOffer.intervalCount,
							introOfferIntervalPeriod: introOffer.intervalUnit,
						},
						components: { br: <br /> },
						comment: 'Excl. Taxes is short for excluding taxes',
					}
				);
			}

			if ( PLAN_ANNUAL_PERIOD === billingPeriod ) {
				return translate(
					'per month, for your first %(introOfferIntervalCount)s %(introOfferIntervalPeriod)s,{{br/}}' +
						'then, %(rawPrice)s for the first year, Excl. Taxes',
					'per month, for your first %(introOfferIntervalCount)s %(introOfferIntervalPeriod)ss,{{br/}}' +
						'then, %(rawPrice)s for the first year, Excl. Taxes',
					{
						count: introOffer.intervalCount,
						args: {
							rawPrice: discountedPriceFullTermText,
							introOfferIntervalCount: introOffer.intervalCount,
							introOfferIntervalPeriod: introOffer.intervalUnit,
						},
						components: { br: <br /> },
						comment: 'Excl. Taxes is short for excluding taxes',
					}
				);
			}
		} else if ( originalPriceFullTermText ) {
			if ( isMonthlyPlan ) {
				return translate(
					'per month, for your first %(introOfferIntervalCount)s %(introOfferIntervalPeriod)s,{{br/}}' +
						'then, %(rawPrice)s billed monthly, Excl. Taxes',
					'per month, for your first %(introOfferIntervalCount)s %(introOfferIntervalPeriod)ss,{{br/}}' +
						'then, %(rawPrice)s billed monthly, Excl. Taxes',
					{
						count: introOffer.intervalCount,
						args: {
							rawPrice: originalPriceFullTermText,
							introOfferIntervalCount: introOffer.intervalCount,
							introOfferIntervalPeriod: introOffer.intervalUnit,
						},
						components: { br: <br /> },
						comment: 'Excl. Taxes is short for excluding taxes',
					}
				);
			}

			if ( PLAN_ANNUAL_PERIOD === billingPeriod ) {
				return translate(
					'per month, for your first %(introOfferIntervalCount)s %(introOfferIntervalPeriod)s,{{br/}}' +
						'then, %(rawPrice)s billed annually, Excl. Taxes',
					'per month, for your first %(introOfferIntervalCount)s %(introOfferIntervalPeriod)ss,{{br/}}' +
						'then, %(rawPrice)s billed annually, Excl. Taxes',
					{
						count: introOffer.intervalCount,
						args: {
							rawPrice: originalPriceFullTermText,
							introOfferIntervalCount: introOffer.intervalCount,
							introOfferIntervalPeriod: introOffer.intervalUnit,
						},
						components: { br: <br /> },
						comment: 'Excl. Taxes is short for excluding taxes',
					}
				);
			}
		}

		/*
		 * Early return here is for sanity. We don't want to show regular billing descriptions
		 * if there is an introOffer (despite that will not be the case, unless some API-level bug happens)
		 */
		return null;
	}

	if ( discountedPriceFullTermText ) {
		if ( PLAN_ANNUAL_PERIOD === billingPeriod ) {
			return translate(
				'per month, %(fullTermDiscountedPriceText)s for the first year, Excl. Taxes',
				{
					args: { fullTermDiscountedPriceText: discountedPriceFullTermText },
					comment: 'Excl. Taxes is short for excluding taxes',
				}
			);
		}

		if ( PLAN_BIENNIAL_PERIOD === billingPeriod ) {
			return translate(
				'per month, %(fullTermDiscountedPriceText)s for the first two years, Excl. Taxes',
				{
					args: { fullTermDiscountedPriceText: discountedPriceFullTermText },
					comment: 'Excl. Taxes is short for excluding taxes',
				}
			);
		}

		if ( PLAN_TRIENNIAL_PERIOD === billingPeriod ) {
			return translate(
				'per month, %(fullTermDiscountedPriceText)s for the first three years, Excl. Taxes',
				{
					args: { fullTermDiscountedPriceText: discountedPriceFullTermText },
					comment: 'Excl. Taxes is short for excluding taxes',
				}
			);
		}
	} else if ( originalPriceFullTermText ) {
		if ( PLAN_ANNUAL_PERIOD === billingPeriod ) {
			return translate( 'per month, %(rawPrice)s billed annually, Excl. Taxes', {
				args: { rawPrice: originalPriceFullTermText },
				comment: 'Excl. Taxes is short for excluding taxes',
			} );
		}

		if ( PLAN_BIENNIAL_PERIOD === billingPeriod ) {
			return translate( 'per month, %(rawPrice)s billed every two years, Excl. Taxes', {
				args: { rawPrice: originalPriceFullTermText },
				comment: 'Excl. Taxes is short for excluding taxes',
			} );
		}

		if ( PLAN_TRIENNIAL_PERIOD === billingPeriod ) {
			return translate( 'per month, %(rawPrice)s billed every three years, Excl. Taxes', {
				args: { rawPrice: originalPriceFullTermText },
				comment: 'Excl. Taxes is short for excluding taxes',
			} );
		}
	}

	return null;
}

const DiscountPromotion = styled.div`
	text-transform: uppercase;
	font-weight: 600;
	color: #306e27;
	font-size: $font-body-extra-small;
	margin-top: 6px;
`;

interface Props {
	planSlug: PlanSlug;
}

const PlanFeatures2023GridBillingTimeframe = ( { planSlug }: Props ) => {
	const translate = useTranslate();
	const { gridPlansIndex } = usePlansGridContext();
	const {
		isMonthlyPlan,
		billingTimeframe,
		pricing: { introOffer },
	} = gridPlansIndex[ planSlug ];
	const perMonthDescription = usePerMonthDescription( { planSlug } );
	const description = perMonthDescription || billingTimeframe;

	if ( isWooExpressPlan( planSlug ) && isMonthlyPlan && ! introOffer ) {
		return (
			<div>
				<div>{ billingTimeframe }</div>
				<DiscountPromotion>{ perMonthDescription }</DiscountPromotion>
			</div>
		);
	}

	if ( isWpcomEnterpriseGridPlan( planSlug ) ) {
		const price = formatCurrency( 25000, 'USD' );

		return (
			<div className="plan-features-2023-grid__vip-price">
				{ translate( 'Starts at {{b}}%(price)s{{/b}} yearly', {
					args: { price },
					components: { b: <b /> },
					comment: 'Translators: the price is in US dollars for all users (US$25,000)',
				} ) }
			</div>
		);
	}

	return <div>{ description }</div>;
};

export default PlanFeatures2023GridBillingTimeframe;
