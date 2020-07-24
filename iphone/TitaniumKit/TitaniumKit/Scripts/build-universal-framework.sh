# Based on https://medium.com/@syshen/create-an-ios-universal-framework-148eb130a46c, thank you!

######################
# Options
######################

REVEAL_ARCHIVE_IN_FINDER=false

FRAMEWORK_NAME="${PROJECT_NAME}"

SIMULATOR_LIBRARY_PATH="${BUILD_DIR}/${CONFIGURATION}-iphonesimulator/${FRAMEWORK_NAME}.framework"

DEVICE_LIBRARY_PATH="${BUILD_DIR}/${CONFIGURATION}-iphoneos/${FRAMEWORK_NAME}.framework"

UNIVERSAL_LIBRARY_DIR="${BUILD_DIR}/${CONFIGURATION}-iphoneuniversal"

FRAMEWORK="${UNIVERSAL_LIBRARY_DIR}/${FRAMEWORK_NAME}.framework"


######################
# Build Frameworks
######################

xcodebuild -scheme ${PROJECT_NAME} -sdk iphonesimulator -configuration ${CONFIGURATION} clean build CONFIGURATION_BUILD_DIR=${BUILD_DIR}/${CONFIGURATION}-iphonesimulator 2>&1

xcodebuild -scheme ${PROJECT_NAME} -sdk iphoneos -configuration ${CONFIGURATION} clean build CONFIGURATION_BUILD_DIR=${BUILD_DIR}/${CONFIGURATION}-iphoneos 2>&1

######################
# Create directory for universal
######################

rm -rf "${UNIVERSAL_LIBRARY_DIR}"

mkdir "${UNIVERSAL_LIBRARY_DIR}"

mkdir "${FRAMEWORK}"


######################
# Copy files Framework
######################

cp -r "${DEVICE_LIBRARY_PATH}/." "${FRAMEWORK}"

######################
# Remove arm64 architecture from simulator build - TIMOB-28042
######################

lipo -remove arm64 "${SIMULATOR_LIBRARY_PATH}/${FRAMEWORK_NAME}" -o "${SIMULATOR_LIBRARY_PATH}/${FRAMEWORK_NAME}"

######################
# Make an universal binary
######################

lipo "${SIMULATOR_LIBRARY_PATH}/${FRAMEWORK_NAME}" "${DEVICE_LIBRARY_PATH}/${FRAMEWORK_NAME}" -create -output "${FRAMEWORK}/${FRAMEWORK_NAME}" | echo

# For Swift framework, Swiftmodule needs to be copied in the universal framework
if [ -d "${SIMULATOR_LIBRARY_PATH}/Modules/${FRAMEWORK_NAME}.swiftmodule/" ]; then
cp -f ${SIMULATOR_LIBRARY_PATH}/Modules/${FRAMEWORK_NAME}.swiftmodule/* "${FRAMEWORK}/Modules/${FRAMEWORK_NAME}.swiftmodule/" | echo
fi

if [ -d "${DEVICE_LIBRARY_PATH}/Modules/${FRAMEWORK_NAME}.swiftmodule/" ]; then
cp -f ${DEVICE_LIBRARY_PATH}/Modules/${FRAMEWORK_NAME}.swiftmodule/* "${FRAMEWORK}/Modules/${FRAMEWORK_NAME}.swiftmodule/" | echo
fi

######################
# On Release, copy the result to release directory
######################
OUTPUT_DIR="${PROJECT_DIR}/dist/${FRAMEWORK_NAME}-${CONFIGURATION}-iphoneuniversal/"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

cp -r "${FRAMEWORK}" "$OUTPUT_DIR"

if [ ${REVEAL_ARCHIVE_IN_FINDER} = true ]; then
open "${OUTPUT_DIR}/"
fi
