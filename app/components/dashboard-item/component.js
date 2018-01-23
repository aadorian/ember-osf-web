import { computed } from '@ember/object';
import moment from 'moment';
import Component from '@ember/component';

export default Component.extend({
    ancestry: computed('node', 'node.{parent,root}', function() {
        const rootId = this.get('node.root.id');
        const parentId = this.get('node.parent.id');
        const grandpaLink = this.get('node.parent.links.relationships.parent.links.related.href');
        const grandpaId = grandpaLink ? grandpaLink.split('nodes')[1].split('/').filter(e => e)[0] : undefined;
        if (!rootId) {
            if (parentId) {
                this.set('_ancestry', this.get('node.parent.title'));
            }
            return '--private';
        }
        if (!parentId) {
            return '';
        }
        if (parentId === rootId) {
            return `${this.get('node.root.title')} / `;
        }
        if (grandpaId === rootId) {
            return `${this.get('node.root.title')} / ${this.get('node.parent.title')} / `;
        }
        return `${this.get('node.root.title')} / ... / ${this.get('node.parent.title')} / `;
    }),
    date: computed('node.dateModified', function() {
        return moment(this.get('node.dateModified')).utc().format('YYYY-MM-DD h:mm A');
    }),
});
