"""
Nudgio Ecommerce Router

Mounts all ecommerce subrouters under the /ecommerce prefix.
"""

from fastapi import APIRouter

# Connection management
from .subrouters.ecommerce_connection_subrouter import router as connections_router
from .subrouters.recommendation_settings_subrouter import router as settings_router

# Recommendation engine
from .subrouters.recommendation_subrouter import router as recommendations_router
from .subrouters.components_subrouter import router as components_router

# Data management
from .subrouters.data_subrouter import router as data_router

# Platform auth flows
from .subrouters.shopify_oauth_subrouter import router as shopify_oauth_router
from .subrouters.woocommerce_auth_subrouter import router as woocommerce_auth_router


router = APIRouter(prefix="/ecommerce")

# Connection management
router.include_router(connections_router)
router.include_router(settings_router)

# Recommendation engine
router.include_router(recommendations_router)
router.include_router(components_router)

# Data management
router.include_router(data_router)

# Platform auth flows
router.include_router(shopify_oauth_router)
router.include_router(woocommerce_auth_router)
