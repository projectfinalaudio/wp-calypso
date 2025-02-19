/* eslint-disable no-case-declarations */

import { merge, get } from 'lodash';
import {
	ALL_SITES_STATS_RECEIVE,
	SITE_STATS_RECEIVE,
	SITE_STATS_REQUEST,
	SITE_STATS_REQUEST_FAILURE,
} from 'calypso/state/action-types';
import { combineReducers, withSchemaValidation } from 'calypso/state/utils';
import { itemSchema } from './schema';
import { getSerializedStatsQuery } from './utils';

/**
 * Returns the updated requests state after an action has been dispatched. The
 * state maps site ID, post ID and stat keys to the request stats.
 *
 * @param  {Object} state  Current state
 * @param  {Object} action Action payload
 * @returns {Object}        Updated state
 */
export const requests = ( state = {}, action ) => {
	switch ( action.type ) {
		case SITE_STATS_REQUEST: {
			const { siteId, statType, query } = action;
			const queryKey = getSerializedStatsQuery( query );
			return merge( {}, state, {
				[ siteId ]: {
					[ statType ]: {
						[ queryKey ]: { requesting: true, status: 'pending' },
					},
				},
			} );
		}
		case SITE_STATS_RECEIVE: {
			const { siteId, statType, query, date } = action;
			const queryKey = getSerializedStatsQuery( query );
			return merge( {}, state, {
				[ siteId ]: {
					[ statType ]: {
						[ queryKey ]: { requesting: false, status: 'success', date },
					},
				},
			} );
		}
		case SITE_STATS_REQUEST_FAILURE: {
			const { siteId, statType, query } = action;
			const queryKey = getSerializedStatsQuery( query );
			return merge( {}, state, {
				[ siteId ]: {
					[ statType ]: {
						[ queryKey ]: { requesting: false, status: 'error' },
					},
				},
			} );
		}
	}

	return state;
};

/**
 * Returns the updated items state after an action has been dispatched. The
 * state maps site ID, statType and and serialized query key to the stat payload.
 *
 * @param  {Object} state  Current state
 * @param  {Object} action Action payload
 * @returns {Object}        Updated state
 */
export const items = withSchemaValidation( itemSchema, ( state = {}, action ) => {
	switch ( action.type ) {
		case SITE_STATS_RECEIVE: {
			const { siteId, statType, query, data } = action;
			const queryKey = getSerializedStatsQuery( query );

			// Build the items state in a way that will preserve all unmodified parts
			// and recreate site -> statType -> queryKey that was currently changed.
			return {
				...state,
				[ siteId ]: {
					...state[ siteId ],
					[ statType ]: {
						...get( state, [ siteId, statType ] ),
						[ queryKey ]: data || null,
					},
				},
			};
		}

		case ALL_SITES_STATS_RECEIVE: {
			const { statType, query, data } = action;
			const newState = { ...state };

			for ( const siteId in data.stats ) {
				// We can receive data for different dates from different sites,
				// since they might have different timezones, so we need to
				// recompute the query key for each site.
				const newQuery = {
					...query,
					date: data.stats[ siteId ].date,
				};
				const queryKey = getSerializedStatsQuery( newQuery );

				newState[ siteId ] = {
					...newState[ siteId ],
					[ statType ]: {
						...( newState[ siteId ] && newState[ siteId ][ statType ]
							? newState[ siteId ][ statType ]
							: {} ),
						[ queryKey ]: data.stats[ siteId ],
					},
				};
			}
			return newState;
		}
	}

	return state;
} );

export default combineReducers( {
	requests,
	items,
} );
