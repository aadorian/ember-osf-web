import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { assert } from '@ember/debug';
import { inject as service } from '@ember/service';
import { underscore } from '@ember/string';
import DS from 'ember-data';
import ModelRegistry from 'ember-data/types/registries/model';
import config from 'ember-get-config';
import { pluralize } from 'ember-inflector';
import Session from 'ember-simple-auth/services/session';

import CurrentUser from 'ember-osf-web/services/current-user';

const {
    OSF: {
        apiUrl: host,
        apiNamespace: namespace,
    },
} = config;

interface AdapterOptions {
    query?: string;
    url?: string;
}

enum RequestType {
    DELETE = 'DELETE',
    GET = 'GET',
    PATCH = 'PATCH',
    POST = 'POST',
    PUT = 'PUT',
}

/**
 * @module ember-osf-web
 * @submodule adapters
 */
/**
 * Base adapter class for all OSF APIv2 endpoints
 *
 * @class OsfAdapter
 * @extends DS.JSONAPIAdapter
 * @uses GenericDataAdapterMixin
 */
export default class OsfAdapter extends JSONAPIAdapter {
    @service session!: Session;
    @service currentUser!: CurrentUser;

    host = host;
    namespace = namespace;

    /**
     * When an object lives "under" another in the API, set `parentRelationship` to the name of
     * the belongsTo that points to the parent object. Requests for creating new children will
     * go to the nested route for that relationship.
     *
     * e.g. If the contributor adapter has `parentRelationship = 'node'`, creating a new contributor
     * for node xyz will POST to /v2/nodes/xyz/contributors/
     *
     * TODO: `OsfAdapter<M extends OsfModel>`, `parentRelationship: RelationshipsFor<M> | null`
     */
    parentRelationship: string | null = null;

    get headers() {
        // Not a computed; evaluate every time in case something changes
        return this.currentUser.ajaxHeaders();
    }

    /**
     * Overrides buildQuery method - Allows users to embed resources with findRecord
     * OSF APIv2 does not have "include" functionality, instead we use 'embed'.
     * Usage: findRecord(type, id, {include: 'resource'}) or findRecord(type, id, {include: ['resource1', resource2]})
     * Swaps included resources with embedded resources
     *
     * @method buildQuery
     */
    buildQuery(snapshot: DS.Snapshot): object {
        const { query: adapterOptionsQuery = {} } = (snapshot.adapterOptions || {}) as AdapterOptions;

        const { viewOnlyToken } = this.currentUser;

        const query: Partial<Record<'include' | 'embed' | 'view_only', string>> = {
            ...super.buildQuery(snapshot),
            ...adapterOptionsQuery,
            ...(viewOnlyToken ? { view_only: viewOnlyToken } : {}),
        };

        return {
            ...query,
            embed: query.include,
            include: undefined,
        };
    }

    buildURL<K extends keyof ModelRegistry>(
        modelName?: K,
        id?: string | null,
        snapshot?: DS.Snapshot<K> | null,
        requestType?: string,
        query?: {},
    ): string {
        let url = super.buildURL(modelName, id, snapshot, requestType, query);

        if (snapshot) {
            const { adapterOptions }: { adapterOptions?: { url?: string } } = snapshot;
            if (adapterOptions && adapterOptions.url) {
                url = adapterOptions.url;
            }
        }

        // Fix issue where CORS request failed on 301s: Ember does not seem to append trailing
        // slash to URLs for single documents, but DRF redirects to force a trailing slash
        if (url.lastIndexOf('/') !== url.length - 1) {
            url += '/';
        }

        return url;
    }

    urlForFindRecord<K extends keyof ModelRegistry>(id: string, modelName: K, snapshot: DS.Snapshot): string {
        if (snapshot && snapshot.record && snapshot.record.links && snapshot.record.links.self) {
            return snapshot.record.links.self;
        }
        return super.urlForFindRecord(id, modelName, snapshot);
    }

    urlForCreateRecord<K extends keyof ModelRegistry>(modelName: K, snapshot: DS.Snapshot<K>): string {
        const { parentRelationship } = this;
        if (!parentRelationship) {
            return super.urlForCreateRecord(modelName, snapshot);
        }

        const parentObj = snapshot.record.belongsTo(parentRelationship).value();
        const inverseRelation = underscore(snapshot.record.inverseFor(parentRelationship).name);

        assert('To create a nested object, the parent must already be loaded.', parentObj);

        const url = parentObj.get(`links.relationships.${inverseRelation}.links.related.href`);

        assert(`Couldn't find create link for nested ${modelName}`, url);

        return url;
    }

    urlForUpdateRecord<K extends keyof ModelRegistry>(id: string, modelName: K, snapshot: DS.Snapshot<K>): string {
        const { links } = snapshot.record;
        if (links && links.self) {
            return links.self;
        }
        return super.urlForUpdateRecord(id, modelName, snapshot);
    }

    urlForDeleteRecord<K extends keyof ModelRegistry>(id: string, modelName: K, snapshot: DS.Snapshot<K>): string {
        const { links } = snapshot.record;
        const url = links.delete || links.self;
        return url || super.urlForDeleteRecord(id, modelName, snapshot);
    }

    ajaxOptions(url: string, type: RequestType, options?: { isBulk?: boolean }): object {
        const hash: any = super.ajaxOptions(url, type, options);

        hash.credentials = 'include';

        if (options && options.isBulk) {
            hash.contentType = 'application/vnd.api+json; ext=bulk';
        }

        return hash;
    }

    buildRelationshipURL(snapshot: DS.Snapshot, relationship: string): string {
        const links = !!relationship && snapshot.record.get(`relationshipLinks.${underscore(relationship)}.links`);

        if (links && (links.self || links.related)) {
            return links.self ? links.self.href : links.related.href;
        }

        return '';
    }

    pathForType(modelName: keyof ModelRegistry): string {
        const underscored = underscore(modelName as string);
        return pluralize(underscored);
    }

    handleResponse(
        status: number,
        headers: object,
        payload: object,
        requestData: object,
    ): object {
        if (status === 401 && this.session.isAuthenticated) {
            this.session.invalidate();
        }
        return super.handleResponse(status, headers, payload, requestData);
    }
}
