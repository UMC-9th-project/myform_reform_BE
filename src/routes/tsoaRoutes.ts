/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TestController } from './tes/test.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { OrdersController } from './orders/orders.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MarketController } from './market/market.controller.js';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';



// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "TsoaResponse_string_": {
        "dataType": "refObject",
        "properties": {
            "resultType": {"dataType":"string","required":true},
            "error": {"dataType":"enum","enums":[null],"required":true},
            "success": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GetOrderSheetResponseDto": {
        "dataType": "refObject",
        "properties": {
            "order_number": {"dataType":"string","required":true},
            "order_item": {"dataType":"nestedObjectLiteral","nestedProperties":{"price":{"dataType":"double","required":true},"quantity":{"dataType":"double","required":true},"selected_options":{"dataType":"array","array":{"dataType":"string"},"required":true},"title":{"dataType":"string","required":true},"thumbnail":{"dataType":"string","required":true},"reformer_nickname":{"dataType":"string","required":true}},"required":true},
            "delivery_address": {"dataType":"union","subSchemas":[{"dataType":"nestedObjectLiteral","nestedProperties":{"address_detail":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"address":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"postal_code":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"delivery_address_id":{"dataType":"string"}}},{"dataType":"enum","enums":[null]}],"required":true},
            "payment": {"dataType":"nestedObjectLiteral","nestedProperties":{"total_amount":{"dataType":"double","required":true},"delivery_fee":{"dataType":"double","required":true},"product_amount":{"dataType":"double","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TsoaResponse_GetOrderSheetResponseDto_": {
        "dataType": "refObject",
        "properties": {
            "resultType": {"dataType":"string","required":true},
            "error": {"dataType":"enum","enums":[null],"required":true},
            "success": {"ref":"GetOrderSheetResponseDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "resultType": {"dataType":"string","required":true},
            "error": {"dataType":"nestedObjectLiteral","nestedProperties":{"data":{"dataType":"union","subSchemas":[{"dataType":"any"},{"dataType":"enum","enums":[null]}]},"reason":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},"errorCode":{"dataType":"string"}},"required":true},
            "success": {"dataType":"enum","enums":[null],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GetOrderSheetRequestDto": {
        "dataType": "refObject",
        "properties": {
            "item_id": {"dataType":"string","required":true},
            "option_item_ids": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "quantity": {"dataType":"double","required":true},
            "delivery_address_id": {"dataType":"string"},
            "new_address": {"dataType":"nestedObjectLiteral","nestedProperties":{"address_detail":{"dataType":"string"},"address":{"dataType":"string"},"postal_code":{"dataType":"string"}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateOrderResponseDto": {
        "dataType": "refObject",
        "properties": {
            "order_id": {"dataType":"string","required":true},
            "payment_status": {"dataType":"string","required":true},
            "payment_method": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "payment_gateway": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TsoaResponse_CreateOrderResponseDto_": {
        "dataType": "refObject",
        "properties": {
            "resultType": {"dataType":"string","required":true},
            "error": {"dataType":"enum","enums":[null],"required":true},
            "success": {"ref":"CreateOrderResponseDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateOrderRequestDto": {
        "dataType": "refObject",
        "properties": {
            "item_id": {"dataType":"string","required":true},
            "option_item_ids": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "quantity": {"dataType":"double","required":true},
            "delivery_address_id": {"dataType":"string"},
            "new_address": {"dataType":"nestedObjectLiteral","nestedProperties":{"address_detail":{"dataType":"string"},"address":{"dataType":"string"},"postal_code":{"dataType":"string"}}},
            "imp_uid": {"dataType":"string","required":true},
            "merchant_uid": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GetOrderResponseDto": {
        "dataType": "refObject",
        "properties": {
            "order_id": {"dataType":"string","required":true},
            "order_number": {"dataType":"string","required":true},
            "status": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "delivery_address": {"dataType":"nestedObjectLiteral","nestedProperties":{"address_detail":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"address":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"postal_code":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true}},"required":true},
            "order_items": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"reformer_nickname":{"dataType":"string","required":true},"selected_options":{"dataType":"array","array":{"dataType":"string"},"required":true},"title":{"dataType":"string","required":true},"thumbnail":{"dataType":"string","required":true}}},"required":true},
            "payment": {"dataType":"nestedObjectLiteral","nestedProperties":{"approved_at":{"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"enum","enums":[null]}],"required":true},"card_info":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"masked_card_number":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"card_name":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"payment_method":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"amount":{"dataType":"double","required":true}},"required":true},
            "first_item": {"dataType":"union","subSchemas":[{"dataType":"nestedObjectLiteral","nestedProperties":{"reformer_nickname":{"dataType":"string","required":true},"selected_options":{"dataType":"array","array":{"dataType":"string"},"required":true},"title":{"dataType":"string","required":true},"thumbnail":{"dataType":"string","required":true}}},{"dataType":"enum","enums":[null]}],"required":true},
            "remaining_items_count": {"dataType":"double","required":true},
            "total_amount": {"dataType":"double","required":true},
            "delivery_fee": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TsoaResponse_GetOrderResponseDto_": {
        "dataType": "refObject",
        "properties": {
            "resultType": {"dataType":"string","required":true},
            "error": {"dataType":"enum","enums":[null],"required":true},
            "success": {"ref":"GetOrderResponseDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GetItemListResponseDto": {
        "dataType": "refObject",
        "properties": {
            "items": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"is_wished":{"dataType":"boolean","required":true},"owner_nickname":{"dataType":"string","required":true},"review_count":{"dataType":"double","required":true},"star":{"dataType":"double","required":true},"price":{"dataType":"double","required":true},"title":{"dataType":"string","required":true},"thumbnail":{"dataType":"string","required":true},"item_id":{"dataType":"string","required":true}}},"required":true},
            "total_count": {"dataType":"double","required":true},
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TsoaResponse_GetItemListResponseDto_": {
        "dataType": "refObject",
        "properties": {
            "resultType": {"dataType":"string","required":true},
            "error": {"dataType":"enum","enums":[null],"required":true},
            "success": {"ref":"GetItemListResponseDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GetItemDetailResponseDto": {
        "dataType": "refObject",
        "properties": {
            "item_id": {"dataType":"string","required":true},
            "title": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "images": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "price": {"dataType":"double","required":true},
            "delivery": {"dataType":"double","required":true},
            "delivery_info": {"dataType":"string","required":true},
            "option_groups": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"option_items":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"quantity":{"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},"extra_price":{"dataType":"double","required":true},"name":{"dataType":"string","required":true},"option_item_id":{"dataType":"string","required":true}}},"required":true},"name":{"dataType":"string","required":true},"option_group_id":{"dataType":"string","required":true}}},"required":true},
            "reformer": {"dataType":"nestedObjectLiteral","nestedProperties":{"order_count":{"dataType":"double","required":true},"star":{"dataType":"double","required":true},"nickname":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"profile_image":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"owner_id":{"dataType":"string","required":true}},"required":true},
            "is_wished": {"dataType":"boolean","required":true},
            "review_summary": {"dataType":"nestedObjectLiteral","nestedProperties":{"remaining_photo_count":{"dataType":"double","required":true},"preview_photos":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"photo_url":{"dataType":"string","required":true},"review_id":{"dataType":"string","required":true},"photo_index":{"dataType":"double","required":true}}},"required":true},"avg_star":{"dataType":"double","required":true},"photo_review_count":{"dataType":"double","required":true},"total_review_count":{"dataType":"double","required":true}},"required":true},
            "reviews": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"photos":{"dataType":"array","array":{"dataType":"string"},"required":true},"product_thumbnail":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"content":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"created_at":{"dataType":"datetime","required":true},"star":{"dataType":"double","required":true},"user_nickname":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"user_profile_image":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"review_id":{"dataType":"string","required":true}}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TsoaResponse_GetItemDetailResponseDto_": {
        "dataType": "refObject",
        "properties": {
            "resultType": {"dataType":"string","required":true},
            "error": {"dataType":"enum","enums":[null],"required":true},
            "success": {"ref":"GetItemDetailResponseDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GetItemReviewsResponseDto": {
        "dataType": "refObject",
        "properties": {
            "reviews": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"photos":{"dataType":"array","array":{"dataType":"string"},"required":true},"product_thumbnail":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"content":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"created_at":{"dataType":"datetime","required":true},"star":{"dataType":"double","required":true},"user_nickname":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"user_profile_image":{"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},"review_id":{"dataType":"string","required":true}}},"required":true},
            "total_count": {"dataType":"double","required":true},
            "avg_star": {"dataType":"double","required":true},
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
            "total_pages": {"dataType":"double","required":true},
            "has_next_page": {"dataType":"boolean","required":true},
            "has_prev_page": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TsoaResponse_GetItemReviewsResponseDto_": {
        "dataType": "refObject",
        "properties": {
            "resultType": {"dataType":"string","required":true},
            "error": {"dataType":"enum","enums":[null],"required":true},
            "success": {"ref":"GetItemReviewsResponseDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GetItemReviewPhotosResponseDto": {
        "dataType": "refObject",
        "properties": {
            "photos": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"photo_order":{"dataType":"double","required":true},"photo_url":{"dataType":"string","required":true},"review_id":{"dataType":"string","required":true},"photo_index":{"dataType":"double","required":true}}},"required":true},
            "has_more": {"dataType":"boolean","required":true},
            "offset": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
            "total_count": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TsoaResponse_GetItemReviewPhotosResponseDto_": {
        "dataType": "refObject",
        "properties": {
            "resultType": {"dataType":"string","required":true},
            "error": {"dataType":"enum","enums":[null],"required":true},
            "success": {"ref":"GetItemReviewPhotosResponseDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GetReviewDetailResponseDto": {
        "dataType": "refObject",
        "properties": {
            "review_id": {"dataType":"string","required":true},
            "user_profile_image": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "user_nickname": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "star": {"dataType":"double","required":true},
            "created_at": {"dataType":"datetime","required":true},
            "content": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "photo_urls": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "product_thumbnail": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "current_photo_index": {"dataType":"double"},
            "total_photo_count": {"dataType":"double"},
            "has_prev": {"dataType":"boolean"},
            "has_next": {"dataType":"boolean"},
            "prev_photo_index": {"dataType":"double"},
            "next_photo_index": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TsoaResponse_GetReviewDetailResponseDto_": {
        "dataType": "refObject",
        "properties": {
            "resultType": {"dataType":"string","required":true},
            "error": {"dataType":"enum","enums":[null],"required":true},
            "success": {"ref":"GetReviewDetailResponseDto","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsTestController_setTest: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/project',
            ...(fetchMiddlewares<RequestHandler>(TestController)),
            ...(fetchMiddlewares<RequestHandler>(TestController.prototype.setTest)),

            async function TestController_setTest(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTestController_setTest, request, response });

                const controller = new TestController();

              await templateService.apiHandler({
                methodName: 'setTest',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_getOrderSheet: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"GetOrderSheetRequestDto"},
                userId: {"in":"header","name":"x-user-id","dataType":"string"},
        };
        app.post('/orders/sheet',
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.getOrderSheet)),

            async function OrdersController_getOrderSheet(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_getOrderSheet, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'getOrderSheet',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_createOrder: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreateOrderRequestDto"},
                userId: {"in":"header","name":"x-user-id","dataType":"string"},
        };
        app.post('/orders',
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.createOrder)),

            async function OrdersController_createOrder(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_createOrder, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'createOrder',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_getOrder: Record<string, TsoaRoute.ParameterSchema> = {
                orderId: {"in":"path","name":"orderId","required":true,"dataType":"string"},
                userId: {"in":"header","name":"x-user-id","dataType":"string"},
        };
        app.get('/orders/:orderId',
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.getOrder)),

            async function OrdersController_getOrder(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_getOrder, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'getOrder',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMarketController_getItemList: Record<string, TsoaRoute.ParameterSchema> = {
                categoryId: {"in":"query","name":"categoryId","dataType":"string"},
                sort: {"default":"popular","in":"query","name":"sort","dataType":"union","subSchemas":[{"dataType":"enum","enums":["popular"]},{"dataType":"enum","enums":["latest"]}]},
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":15,"in":"query","name":"limit","dataType":"double"},
                userId: {"in":"header","name":"x-user-id","dataType":"string"},
        };
        app.get('/market',
            ...(fetchMiddlewares<RequestHandler>(MarketController)),
            ...(fetchMiddlewares<RequestHandler>(MarketController.prototype.getItemList)),

            async function MarketController_getItemList(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMarketController_getItemList, request, response });

                const controller = new MarketController();

              await templateService.apiHandler({
                methodName: 'getItemList',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMarketController_getItemDetail: Record<string, TsoaRoute.ParameterSchema> = {
                itemId: {"in":"path","name":"itemId","required":true,"dataType":"string"},
                userId: {"in":"header","name":"x-user-id","dataType":"string"},
        };
        app.get('/market/:itemId',
            ...(fetchMiddlewares<RequestHandler>(MarketController)),
            ...(fetchMiddlewares<RequestHandler>(MarketController.prototype.getItemDetail)),

            async function MarketController_getItemDetail(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMarketController_getItemDetail, request, response });

                const controller = new MarketController();

              await templateService.apiHandler({
                methodName: 'getItemDetail',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMarketController_getItemReviews: Record<string, TsoaRoute.ParameterSchema> = {
                itemId: {"in":"path","name":"itemId","required":true,"dataType":"string"},
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":4,"in":"query","name":"limit","dataType":"double"},
                sort: {"default":"latest","in":"query","name":"sort","dataType":"union","subSchemas":[{"dataType":"enum","enums":["latest"]},{"dataType":"enum","enums":["star_high"]},{"dataType":"enum","enums":["star_low"]}]},
        };
        app.get('/market/:itemId/reviews',
            ...(fetchMiddlewares<RequestHandler>(MarketController)),
            ...(fetchMiddlewares<RequestHandler>(MarketController.prototype.getItemReviews)),

            async function MarketController_getItemReviews(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMarketController_getItemReviews, request, response });

                const controller = new MarketController();

              await templateService.apiHandler({
                methodName: 'getItemReviews',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMarketController_getItemReviewPhotos: Record<string, TsoaRoute.ParameterSchema> = {
                itemId: {"in":"path","name":"itemId","required":true,"dataType":"string"},
                offset: {"default":0,"in":"query","name":"offset","dataType":"double"},
                limit: {"default":15,"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/market/:itemId/reviews/photos',
            ...(fetchMiddlewares<RequestHandler>(MarketController)),
            ...(fetchMiddlewares<RequestHandler>(MarketController.prototype.getItemReviewPhotos)),

            async function MarketController_getItemReviewPhotos(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMarketController_getItemReviewPhotos, request, response });

                const controller = new MarketController();

              await templateService.apiHandler({
                methodName: 'getItemReviewPhotos',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMarketController_getReviewDetail: Record<string, TsoaRoute.ParameterSchema> = {
                itemId: {"in":"path","name":"itemId","required":true,"dataType":"string"},
                reviewId: {"in":"path","name":"reviewId","required":true,"dataType":"string"},
                photoIndex: {"in":"query","name":"photoIndex","dataType":"double"},
        };
        app.get('/market/:itemId/reviews/:reviewId',
            ...(fetchMiddlewares<RequestHandler>(MarketController)),
            ...(fetchMiddlewares<RequestHandler>(MarketController.prototype.getReviewDetail)),

            async function MarketController_getReviewDetail(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMarketController_getReviewDetail, request, response });

                const controller = new MarketController();

              await templateService.apiHandler({
                methodName: 'getReviewDetail',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
