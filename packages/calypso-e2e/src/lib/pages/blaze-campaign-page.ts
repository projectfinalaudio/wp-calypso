import { Page } from 'playwright';
import { TestFile } from '../../types';

/**
 * Page representing the Blaze Campaign page (/advertising/posts).
 */
export class BlazeCampaignPage {
	private page: Page;

	/**
	 * Constructs an instance of the component.
	 *
	 * @param {Page} page The underlying page.
	 */
	constructor( page: Page ) {
		this.page = page;
	}

	/**
	 * Clicks on a button with the accessible name matching the supplied parameter `name`.
	 *
	 * @param {string} name Accessible name of the button.
	 */
	async clickButton( name: string ) {
		await this.page.getByRole( 'button', { name: name } ).click();
	}

	/**
	 * Enters text into any text field, except for the secure payment details fields.
	 *
	 * @param {string} name Accessible name of the target text field.
	 * @param {string} text Text to enter.
	 */
	async enterText( name: string, text: string ) {
		await this.page.getByRole( 'textbox', { name: name } ).fill( text );
	}

	/**
	 * Uploads the specified image to the Blaze campaign image.
	 *
	 * @param {TestFile} path TestFile object.
	 */
	async uploadImage( path: TestFile ) {
		await this.page
			.getByLabel( 'Click or drag an image here to upload.' )
			.setInputFiles( path.fullpath );

		await this.page.getByRole( 'region', { name: 'Appearance' } ).locator( 'img' ).waitFor();
	}

	/**
	 * Validates the expected contents are in the preview.
	 *
	 * @param param0 Keyed object parameter.
	 * @param {string} param0.title Expected title.
	 * @param {string} param0.snippet Expected snippet.
	 */
	async validatePreview( { title, snippet }: { title: string; snippet: string } ) {
		await this.page.locator( '.grid-widget-summary' ).getByText( title ).waitFor();
		await this.page.locator( '.grid-widget-summary' ).getByText( snippet ).waitFor();
	}
}
