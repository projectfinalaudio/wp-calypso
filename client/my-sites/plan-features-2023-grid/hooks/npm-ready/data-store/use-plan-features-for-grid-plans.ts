import { applyTestFiltersToPlansList, isMonthly } from '@automattic/calypso-products';
import getPlanFeaturesObject from 'calypso/my-sites/plan-features-2023-grid/lib/get-plan-features-object';
import type { FeatureObject, FeatureList, PlanSlug } from '@automattic/calypso-products';
import type {
	TransformedFeatureObject,
	PlanFeaturesForGridPlan,
	PlansIntent,
} from 'calypso/my-sites/plan-features-2023-grid/hooks/npm-ready/data-store/use-grid-plans';

export type UsePlanFeaturesForGridPlans = ( {
	planSlugs,
	// allFeaturesList temporary until feature definitions are ported to calypso-products package
	allFeaturesList,
	intent,
	showLegacyStorageFeature,
	selectedFeature,
}: {
	planSlugs: PlanSlug[];
	allFeaturesList: FeatureList;
	intent?: PlansIntent;
	selectedFeature?: string | null;
	showLegacyStorageFeature?: boolean;
} ) => { [ planSlug: string ]: PlanFeaturesForGridPlan };

/*
 * usePlanFeaturesForGridPlans:
 * - these plan features are mainly relevannt to FeaturesGrid and Spotlight components
 * - this hook can migrate to data store once features definitions migrate to calypso-products
 */
const usePlanFeaturesForGridPlans: UsePlanFeaturesForGridPlans = ( {
	planSlugs,
	allFeaturesList,
	intent,
	selectedFeature,
	showLegacyStorageFeature,
} ) => {
	return planSlugs.reduce( ( acc, planSlug ) => {
		const planConstantObj = applyTestFiltersToPlansList( planSlug, undefined );
		const isMonthlyPlan = isMonthly( planSlug );

		let wpcomFeatures = [];
		let jetpackFeatures: FeatureObject[] = [];

		if ( 'plans-newsletter' === intent ) {
			wpcomFeatures = getPlanFeaturesObject(
				allFeaturesList,
				planConstantObj?.getNewsletterSignupFeatures?.() ?? []
			);
		} else if ( 'plans-link-in-bio' === intent ) {
			wpcomFeatures = getPlanFeaturesObject(
				allFeaturesList,
				planConstantObj?.getLinkInBioSignupFeatures?.() ?? []
			);
		} else if ( 'plans-blog-onboarding' === intent ) {
			wpcomFeatures = getPlanFeaturesObject(
				allFeaturesList,
				planConstantObj?.getBlogOnboardingSignupFeatures?.() ?? []
			);

			jetpackFeatures = getPlanFeaturesObject(
				allFeaturesList,
				planConstantObj.getBlogOnboardingSignupJetpackFeatures?.() ?? []
			);
		} else {
			wpcomFeatures = getPlanFeaturesObject(
				allFeaturesList,
				planConstantObj?.get2023PricingGridSignupWpcomFeatures?.() ?? []
			);

			jetpackFeatures = getPlanFeaturesObject(
				allFeaturesList,
				planConstantObj.get2023PricingGridSignupJetpackFeatures?.() ?? []
			);
		}

		const annualPlansOnlyFeatures = planConstantObj.getAnnualPlansOnlyFeatures?.() || [];
		const wpcomFeaturesTransformed: TransformedFeatureObject[] = [];
		const jetpackFeaturesTransformed = jetpackFeatures.map( ( feature ) => {
			const availableOnlyForAnnualPlans = annualPlansOnlyFeatures.includes( feature.getSlug() );

			return {
				...feature,
				availableOnlyForAnnualPlans,
				availableForCurrentPlan: ! isMonthlyPlan || ! availableOnlyForAnnualPlans,
			};
		} );

		const topFeature = selectedFeature
			? wpcomFeatures.find( ( feature ) => feature.getSlug() === selectedFeature )
			: undefined;

		if ( topFeature ) {
			const availableOnlyForAnnualPlans = annualPlansOnlyFeatures.includes( topFeature.getSlug() );
			wpcomFeaturesTransformed.unshift( {
				...topFeature,
				availableOnlyForAnnualPlans,
				availableForCurrentPlan: ! isMonthlyPlan || ! availableOnlyForAnnualPlans,
			} );
		}

		if ( annualPlansOnlyFeatures.length > 0 ) {
			wpcomFeatures.forEach( ( feature ) => {
				if ( feature === topFeature ) {
					return;
				}

				const availableOnlyForAnnualPlans = annualPlansOnlyFeatures.includes( feature.getSlug() );

				wpcomFeaturesTransformed.push( {
					...feature,
					availableOnlyForAnnualPlans,
					availableForCurrentPlan: ! isMonthlyPlan || ! availableOnlyForAnnualPlans,
				} );
			} );
		}

		return {
			...acc,
			[ planSlug ]: {
				wpcomFeatures: wpcomFeaturesTransformed,
				jetpackFeatures: jetpackFeaturesTransformed,
				storageOptions:
					planConstantObj.get2023PricingGridSignupStorageOptions?.( showLegacyStorageFeature ) ??
					[],
			},
		};
	}, {} as { [ planSlug: string ]: PlanFeaturesForGridPlan } );
};

export default usePlanFeaturesForGridPlans;
