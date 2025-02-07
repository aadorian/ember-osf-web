import { attr, hasMany, AsyncHasMany, belongsTo, AsyncBelongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Intl from 'ember-intl/services/intl';
import BrandModel from 'ember-osf-web/models/brand';

import { RelatedLinkMeta } from 'osf-api';

import PreprintModel from './preprint';
import ProviderModel from './provider';

export type PreprintWord = 'default' | 'work' | 'paper' | 'preprint' | 'thesis';
export type PreprintWordGrammar = 'plural' | 'pluralCapitalized' | 'singular' | 'singularCapitalized';

export default class PreprintProviderModel extends ProviderModel {
    @service intl!: Intl;

    @attr('array') subjectsAcceptable!: string[];
    @attr('array') additionalProviders!: string[];
    @attr('string') shareSource!: string;
    @attr('string') preprintWord!: PreprintWord;

    // Reviews settings
    @attr('array') permissions!: string[];
    @attr('boolean', { allowNull: true }) reviewsCommentsPrivate!: boolean | null;

    // Relationships
    @belongsTo('brand')
    brand!: AsyncBelongsTo<BrandModel> & BrandModel;

    @hasMany('preprint', { inverse: 'provider' })
    preprints!: AsyncHasMany<PreprintModel>;

    @alias('links.relationships.preprints.links.related.meta')
    reviewableStatusCounts!: RelatedLinkMeta;

    @alias('links.relationships.highlighted_subjects.links.related.meta.has_highlighted_subjects')
    hasHighlightedSubjects!: boolean;

    @computed('intl.locale', 'preprintWord')
    get documentType(): Record<PreprintWordGrammar, string> {
        const { preprintWord } = this;
        const documentType = `documentType.${preprintWord}`;
        return {
            plural: this.intl.t(`${documentType}.plural`),
            pluralCapitalized: this.intl.t(`${documentType}.pluralCapitalized`),
            singular: this.intl.t(`${documentType}.singular`),
            singularCapitalized: this.intl.t(`${documentType}.singularCapitalized`),
        };
    }
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'preprint-provider': PreprintProviderModel;
    } // eslint-disable-line semi
}
