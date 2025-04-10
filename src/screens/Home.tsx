import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import { Text, Card } from '@rneui/themed'
import { useCallback, useEffect, useState } from 'react'
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5'
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6'
import DropDownPicker from 'react-native-dropdown-picker'
import { storage } from '../utils/storage'
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads'
import Modal from 'react-native-modal'
import notifee, { AndroidImportance, TimestampTrigger, TriggerType } from '@notifee/react-native'

type Memo = {
    id: number
    text: string
    time: string
    unit: string
    updatedAt: number | null
}

const MEMO_STORAGE_KEY = 'memoList'

const Home = () => {
    const [memoList, setMemoList] = useState<Memo[]>([])
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const [sortOpen, setSortOpen] = useState(false)
    const [selectedSort, setSelectedSort] = useState('latest')
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false)
    const [memoToDelete, setMemoToDelete] = useState<number | null>(null)
    const [isStorageFullModalVisible, setStorageFullModalVisible] = useState(false)
    const [scheduledNotifications, setScheduledNotifications] = useState<Set<number>>(new Set())
    const [openUnitDropdown, setOpenUnitDropdown] = useState<number | null>(null)
    const [isValidationModalVisible, setValidationModalVisible] = useState(false)
    const [validationMessgae, setValidationMessage] = useState('')
    const sortOptions = [
        { label: '등록 최신순', value: 'latest' },
        { label: '등록 오래된순', value: 'oldest' },
        { label: '삭제 임박순', value: 'urgent' },
        { label: '삭제 여유순', value: 'relaxed' },
    ]
    const timeUnitOptions = [
        { label: '분', value: 'minutes' },
        { label: '시간', value: 'hours' },
        { label: '일', value: 'days' },
    ]

    // notifee 초기화
    useEffect(() => {
        const initializeNotifee = async () => {
            // 안드로이드 알림 채널 생성
            if (Platform.OS === 'android') {
                await notifee.createChannel({
                    id: 'memo_channel',
                    name: 'Memo Notifications',
                    description: 'Notifications for memo expiration',
                    importance: AndroidImportance.HIGH,
                    sound: 'default',
                    vibration: true
                })
            }

            if(Platform.OS === 'ios') {
                await notifee.requestPermission()
            }
        }

        initializeNotifee()
    }, [])

    const onPressDelete = (id: number) => {
        setMemoToDelete(id)
        setDeleteModalVisible(true)
    }

    const confirmDelete = useCallback(async () => {
        if(memoToDelete != null) {
            // 삭제 시 해당 메모의 알림 취소
            await notifee.cancelNotification(memoToDelete.toString())
            setScheduledNotifications((prev) => {
                const newSet = new Set(prev)
                newSet.delete(memoToDelete)
                return newSet
            })

            setMemoList((prev) => prev.filter((item) => item.id !== memoToDelete))
            setSortOpen(false)
            Keyboard.dismiss()
        }
        setDeleteModalVisible(false)
        setMemoToDelete(null)
    }, [memoToDelete])

    const cancelDelete = useCallback(() => {
        setDeleteModalVisible(false)
        setMemoToDelete(null)
    }, [])

    const onPressNewCard = () => {
        const newMemo = {
            id: Date.now(),
            text: '',
            time: '',
            unit: 'minutes',
            updatedAt: null
        }
        setMemoList((prev) => [...prev, newMemo])
    }

    const getSortedMemoList = () => {
        const list = [...memoList]
        switch (selectedSort) {
            case 'latest':
                return list.sort((a, b) => b.id - a.id)
            case 'oldest':
                return list.sort((a, b) => a.id - b.id)
            case 'urgent':
                return list.sort((a, b) => {
                    const aMinutes = a.time ? convertToMinutes(a.time, a.unit) : Infinity
                    const bMinutes = b.time ? convertToMinutes(b.time, b.unit) : Infinity
                    return aMinutes - bMinutes
                })
            case 'relaxed':
                return list.sort((a, b) => {
                    const aMinutes = a.time ? convertToMinutes(a.time, a.unit) : -Infinity
                    const bMinutes = b.time ? convertToMinutes(b.time, b.unit) : -Infinity
                    return bMinutes - aMinutes
                })
            default:
                return list
        }
    }

    const onFocusTextInput = () => {
        setSortOpen(false)
        setOpenUnitDropdown(null)
    }

    const onPressFilter = () => {
        setSortOpen((prev) => !prev)
        setOpenUnitDropdown(null)
        Keyboard.dismiss()
    }

    useEffect(() => {
        const saved = storage.getString(MEMO_STORAGE_KEY)
        if(saved) {
            const parsed = JSON.parse(saved)
            const updatedList = parsed.map((memo: any) => ({
                ...memo,
                updatedAt: memo.updatedAt || null,
                time: memo.time || '',
                unit: memo.unit || 'minutes'
            }))
            setMemoList(updatedList)
        }else{
            onPressNewCard()
        }
    }, [])

    const handleStorageFullModalClose = useCallback(() => {
        setStorageFullModalVisible(false)
        console.log('용량 초과 알림 확인')
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            if(memoList.length === 0) {
                onPressNewCard()
            }else{
                try {
                    storage.set(MEMO_STORAGE_KEY, JSON.stringify(memoList))
                } catch (error) {
                    console.error('MMKV 저장 실패 : ', error)
                    setStorageFullModalVisible(true)
                }
            }
        }, 100)

        return () => clearTimeout(timer)
    }, [memoList])

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now()
            setMemoList((prev) => {
                const updatedList = prev.filter((memo) => {
                    if(!memo.time || !memo.updatedAt) {
                        return true
                    }

                    const timeInMinutes = convertToMinutes(memo.time, memo.unit)
                    const timeInMilliseconds = timeInMinutes * 60 * 1000
                    const expirationTime = memo.updatedAt + timeInMilliseconds
                    const timeLeft = expirationTime - now
                    
                    // 삭제 1분 전 알림 예약
                    if(timeLeft <= 61 * 1000 && timeLeft > 60 * 1000 && !scheduledNotifications.has(memo.id)) {
                        const fireDate = new Date(expirationTime - 60 * 1000)
                        const trigger: TimestampTrigger = {
                            type: TriggerType.TIMESTAMP,
                            timestamp: fireDate.getTime()
                        }

                        notifee.createTriggerNotification(
                            {
                                id: memo.id.toString(),
                                title: '블립메모',
                                body: `"${memo.text.slice(0, 20)}${memo.text.length > 20 ? '...' : ''}" 메모가 1분 후 삭제됩니다`,
                                android: {
                                    channelId: 'memo_channel',
                                    smallIcon: 'ic_notification',
                                    sound: 'default',
                                    vibrationPattern: [300, 500],
                                    pressAction: {
                                        id: 'default'
                                    }
                                },
                                ios: {
                                    sound: 'default'
                                }
                            },
                            trigger
                        )
                        setScheduledNotifications((prev) => new Set(prev).add(memo.id))
                    }

                    return now < expirationTime
                })

                if(updatedList.length === 0) {
                    const newMemo: Memo = {
                        id: Date.now(),
                        text: '',
                        time: '',
                        unit: 'minutes',
                        updatedAt: null
                    }
                    updatedList.push(newMemo)
                }

                try {
                    storage.set(MEMO_STORAGE_KEY, JSON.stringify(updatedList))
                } catch (error) {
                    console.error('MMKV 저장 실패 : ', error)
                    setStorageFullModalVisible(true)
                }

                return updatedList
            })
        }, 1000)
        return () => clearInterval(interval)
    })

    const handleBackgroundPress = useCallback(() => {
        if(!isDeleteModalVisible && !isStorageFullModalVisible) {
            setSortOpen(false)
            setOpenUnitDropdown(null)
            Keyboard.dismiss()
        }
    }, [isDeleteModalVisible, isStorageFullModalVisible])

    const convertToMinutes = (time: string, unit: string): number => {
        const value = parseFloat(time)
        if (isNaN(value)) return 0
        switch (unit) {
            case 'minutes': return value
            case 'hours': return value * 60
            case 'days': return value * 60 * 24
            default: return value
        }
    }

    return (
        <TouchableWithoutFeedback onPress={handleBackgroundPress}>
            <SafeAreaView style={styles.safeContainer}>
                <KeyboardAvoidingView
                    behavior={'height'}
                    keyboardVerticalOffset={20}
                    style={styles.keyboardAvoidingView}
                >
                    <View style={styles.titleHeaderRow}>
                        <Text style={styles.title}>블립노트</Text>
                        <View style={{ position: 'relative' }}>
                            <TouchableOpacity onPress={onPressFilter}>
                                <FontAwesome6 name="sliders" size={25} />
                            </TouchableOpacity>
                            {sortOpen && (
                                <View style={styles.sortDropdownWrapper}>
                                    <DropDownPicker
                                        open={true}
                                        value={selectedSort}
                                        items={sortOptions}
                                        setOpen={() => {
                                            setSortOpen(true)
                                            setOpenUnitDropdown(null)
                                        }}
                                        setValue={setSelectedSort}
                                        setItems={() => {}}
                                        style={{ display: 'none' }}
                                        dropDownContainerStyle={styles.sortDropdownContainer}
                                        selectedItemLabelStyle={{
                                            fontWeight: 'bold'
                                        }}
                                        textStyle={{ fontSize: 14 }}
                                        placeholder="정렬 선택"
                                        listMode="SCROLLVIEW"
                                        onClose={() => setSortOpen(false)}
                                        showArrowIcon={false}
                                        zIndex={9999}
                                        zIndexInverse={9999}
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                    <FlatList
                        data={getSortedMemoList()}
                        renderItem={({ item, index }) => (
                            <Card key={item.id} containerStyle={[styles.card, { zIndex: selectedIndex === index ? 1000 : 1 }]}>
                                <View style={styles.headerRow}>
                                    <View style={styles.timeInputContainer}>
                                    <TextInput
                                        style={styles.timeInput}
                                        keyboardType="numeric"
                                        value={item.time}
                                        onChangeText={(text) => {
                                            const value = text.replace(/[^0-9]/g, '')
                                            const numValue = parseFloat(value)
                                            if (value && (numValue <= 0 || numValue > 525600 / convertToMinutes('1', item.unit))) {
                                                setValidationMessage('최대 1년 이내의 기간을 입력하세요')
                                                setValidationModalVisible(true)
                                                return
                                            }
                                            setMemoList((prev) =>
                                                prev.map((memo) =>
                                                    memo.id === item.id
                                                        ? { ...memo, time: value, updatedAt: value ? Date.now() : null }
                                                        : memo
                                                )
                                            )
                                        }}
                                        placeholder="시간"
                                        maxLength={5}
                                        onFocus={() => setOpenUnitDropdown(null)}
                                    />
                                    </View>
                                    <View style={styles.unitDropdownWrapper}>
                                        <DropDownPicker
                                            open={openUnitDropdown === item.id}
                                            value={item.unit}
                                            items={timeUnitOptions}
                                            setOpen={(value) => {
                                                const isOpen = typeof value === 'function' ? value(openUnitDropdown === item.id) : value
                                                setOpenUnitDropdown(isOpen ? item.id : null)
                                                setSortOpen(false)
                                            }}
                                            setValue={(callback) => {
                                                const newUnit = typeof callback === 'function' ? callback(item.unit) : callback
                                                setMemoList((prev) =>
                                                    prev.map((memo) =>
                                                        memo.id === item.id
                                                            ? { ...memo, unit: newUnit, time: '', updatedAt: memo.time ? Date.now() : null }
                                                            : memo
                                                    )
                                                )
                                            }}
                                            setItems={() => {}}
                                            style={styles.unitDropdown}
                                            dropDownContainerStyle={styles.unitDropdownContainer}
                                            selectedItemLabelStyle={{
                                                fontWeight: 'bold'
                                            }}
                                            textStyle={{ fontSize: 14, fontFamily: 'NanumGothic' }}
                                            zIndex={5000}
                                            zIndexInverse={5000}
                                        />
                                    </View>
                                    <Text style={styles.afterText}>후 자동 삭제</Text>
                                    <View style={styles.buttonGroup}>
                                        <TouchableOpacity onPress={() => onPressDelete(item.id)}>
                                            <FontAwesome5 name="trash-alt" size={25} color="#CD5C5C" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <TextInput
                                    style={styles.memoInput}
                                    multiline
                                    placeholder={`잠깐 기록할 메모를 입력하세요!\n(500자까지만 메모가 가능합니다)\n(메모 시 바로 자동 저장됩니다)`}
                                    value={item.text}
                                    maxLength={500}
                                    onChangeText={(text) => {
                                        setMemoList((prev) =>
                                            prev.map((memo) => (memo.id === item.id ? { ...memo, text } : memo))
                                        );
                                    }}
                                    onFocus={onFocusTextInput}
                                />
                            </Card>
                        )}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.scrollViewContentContainer}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={false}
                    />
                    <TouchableOpacity
                        style={styles.fab}
                        onPress={onPressNewCard}
                    >
                        <FontAwesome6 name='plus' size={25} color="#DDD" />
                    </TouchableOpacity>
                </KeyboardAvoidingView>
                <View style={styles.adBanner}>
                    <BannerAd
                        unitId="ca-app-pub-4250906367423857/4658096589"
                        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                        requestOptions={{
                            requestNonPersonalizedAdsOnly: true
                        }}
                        onAdFailedToLoad={(error) => {
                            console.log('배너광고 Load 실패 : ', error)
                        }}
                    />
                </View>

                <Modal
                    isVisible={isDeleteModalVisible}
                    onBackdropPress={cancelDelete}
                    onBackButtonPress={cancelDelete}
                    style={styles.modal}
                    animationIn="fadeIn"
                    animationOut="fadeOut"
                    animationInTiming={200}
                    animationOutTiming={200}
                    backdropTransitionOutTiming={0}
                    backdropOpacity={0.3}
                >
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalText}>해당 메모를 삭제하시겠습니까?</Text>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={cancelDelete}>
                                <Text style={styles.modalButtonText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={confirmDelete}>
                                <Text style={styles.modalButtonText}>확인</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <Modal
                    isVisible={isStorageFullModalVisible}
                    onBackdropPress={handleStorageFullModalClose}
                    onBackButtonPress={handleStorageFullModalClose}
                    style={styles.modal}
                    animationIn="fadeIn"
                    animationOut="fadeOut"
                    animationInTiming={200}
                    animationOutTiming={200}
                    backdropTransitionOutTiming={0}
                    backdropOpacity={0.3}
                >
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalText}>저장 용량 초과</Text>
                        <Text style={[styles.modalText, { marginBottom: 20 }]}>저장 공간이 부족합니다. 메모를 삭제하거나 용량을 정리해 주세요</Text>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleStorageFullModalClose}>
                                <Text style={styles.modalButtonText}>확인</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <Modal
                    isVisible={isValidationModalVisible}
                    onBackdropPress={() => setValidationModalVisible(false)}
                    onBackButtonPress={() => setValidationModalVisible(false)}
                    style={styles.modal}
                    animationIn="fadeIn"
                    animationOut="fadeOut"
                    animationInTiming={200}
                    animationOutTiming={200}
                    backdropTransitionOutTiming={0}
                    backdropOpacity={0.3}
                >
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalText}>{validationMessgae}</Text>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={() => setValidationModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>확인</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    )
}

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: '#FFF',
        minHeight: '100%',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    titleHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 30,
        paddingRight: 30,
        paddingTop: 20
    },
    title: {
        fontSize: 25,
        fontFamily: 'BlackHanSans-Regular'
    },
    scrollViewContentContainer: {
        flexGrow: 1,
        marginTop: 5,
        paddingBottom: 50
    },
    card: {
        borderRadius: 8,
        padding: 15,
        borderColor: '#36454F',
        elevation: 5,
        backgroundColor: '#F8F8F8'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    timeInput: {
        width: 70,
        height: 50,
        borderColor: '#CCC',
        borderWidth: 1,
        borderRadius: 6,
        backgroundColor: '#FFF',
        fontFamily: 'NanumGothic',
        fontWeight: 'bold',
        textAlign: 'center'
    },
    afterText: {
        color: '#36454F',
        fontFamily: 'NanumGothic',
        fontWeight: 'bold',
        paddingRight: 30
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        paddingLeft: 10
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdown: {
        width: 110,
        height: 38,
        borderRadius: 6,
        borderColor: '#CCC',
        elevation: 3,
    },
    dropdownContainer: {
        width: 110,
        borderColor: '#CCC',
        borderRadius: 6,
        elevation: 3,
    },
    memoInput: {
        height: 100,
        borderColor: '#DDD',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        textAlignVertical: 'top',
        marginTop: 10,
        backgroundColor: '#FAFAFA',
        elevation: 3,
        fontFamily: 'NanumGothic'
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 10, 
        paddingRight: 10, 
    },
    fab: {
        position: 'absolute',
        right: 15,
        bottom: 10,
        backgroundColor: '#36454F',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        borderWidth: 1,
        borderColor: '#00000022',
    },
    sortDropdownWrapper: {
        width: 150, 
        position: 'absolute', 
        top: 35, 
        right: -15,
        zIndex: 9999
    },
    sortDropdownContainer: {
        borderColor: '#CCC', 
        zIndex: 9999, 
        elevation: 5, 
        borderRadius: 8
    },
    adBanner: {
        height: 60,
        backgroundColor: '#EEE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    adText: {
        fontSize: 14,
        color: '#777',
    },
    modal: {
        justifyContent: 'center',
        margin: 20,
    },
    modalContainer: {
        backgroundColor: '#F8F8F8',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalText: {
        fontSize: 17,
        marginBottom: 20,
        textAlign: 'center',
        fontFamily: 'NanumGothic',
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        flex: 1,
        padding: 10,
        marginHorizontal: 5,
        borderRadius: 5,
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#CD5C5C',
    },
    cancelButton: {
        backgroundColor: 'gray',
    },
    modalButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'NanumGothic',
    },
    unitDropdownWrapper: {
        alignSelf: 'center'
    },
    unitDropdown: {
        width: 100,
        borderColor: '#CCC',
        borderRadius: 5,
        paddingVertical: 0,
    },
    unitDropdownContainer: {
        width: 100,
        borderColor: '#CCC',
        borderRadius: 5,
    },
})

export default Home