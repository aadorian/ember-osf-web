import { click, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { EnginesTestContext } from 'ember-engines/test-support';
import { setupEngineRenderingTest } from 'ember-osf-web/tests/helpers/engines';
import { module, test } from 'qunit';

module('Registries | Integration | Component | Navbar', hooks => {
    setupEngineRenderingTest(hooks, 'registries');

    test('it renders', async function(this: EnginesTestContext, assert) {
        await render(hbs`
            <Navbar>
                This is a test!
            </Navbar>
        `,
        { owner: this.engine });

        assert.dom('nav').exists();
        assert.dom('nav').hasText('This is a test!');
    });

    test('it yields components', async function(this: EnginesTestContext, assert) {
        assert.expect(4);

        this.set('action1', () => assert.ok(true, 'Action 1 was called using click='));
        this.set('action2', () => assert.ok(true, 'Action 2 was called using onclick='));

        await render(hbs`
            <Navbar as |nav|>
                <nav.buttons.primary @click={{action action2}} data-test-id="1">
                    Hello World!
                </nav.buttons.primary>

                <nav.buttons.secondary @onclick={{action action2}} data-test-id="2">
                    Hello World Again!
                </nav.buttons.secondary>
            </Navbar>
        `,
        { owner: this.engine });

        assert.dom('nav > a[data-test-id="1"][role="button"]').hasText('Hello World!');
        assert.dom('nav > a[data-test-id="2"][role="button"]').hasText('Hello World Again!');

        await click('[data-test-id="1"]');
        await click('[data-test-id="2"]');
    });
});
