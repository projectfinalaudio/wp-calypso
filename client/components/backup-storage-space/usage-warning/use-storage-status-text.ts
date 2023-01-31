import { useTranslate, TranslateResult } from 'i18n-calypso';
import { useMemo } from 'react';
import { StorageUsageLevelName, StorageUsageLevels } from 'calypso/state/rewind/storage/types';

const useStorageStatusText = (
	usageLevel: StorageUsageLevelName,
	daysOfBackupsSaved: number,
	minDaysOfBackupsAllowed: number
): TranslateResult | null => {
	const translate = useTranslate();

	return useMemo( () => {
		switch ( usageLevel ) {
			case StorageUsageLevels.Warning:
				return translate(
					'You are close to reaching your storage limit. Once you do, we will delete your oldest backups to make space for new ones.'
				);
			case StorageUsageLevels.Critical:
				return translate(
					'You are very close to reaching your storage limit. Once you do, we will delete your oldest backups to make space for new ones.'
				);
			case StorageUsageLevels.Full:
				return translate(
					'You have reached your storage limit with %(daysOfBackupsSaved)d day(s) of backups saved. Backups have been stopped. Please upgrade your storage to resume backups.',
					{
						args: { daysOfBackupsSaved },
					}
				);
			case StorageUsageLevels.BackupsDiscarded:
				return translate(
					'We removed your oldest backup(s) to make space for new ones. We will continue to remove old backups as needed, up to the last %(minDaysOfBackupsAllowed)d days.',
					{
						args: { minDaysOfBackupsAllowed },
					}
				);
		}

		return null;
	}, [ translate, usageLevel, daysOfBackupsSaved, minDaysOfBackupsAllowed ] );
};

export default useStorageStatusText;
