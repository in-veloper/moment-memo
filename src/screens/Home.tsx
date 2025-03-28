import { Keyboard, KeyboardAvoidingView, SafeAreaView, ScrollView, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import { Text, Card } from '@rneui/themed'
import { useEffect, useState } from 'react'
import Entypo from 'react-native-vector-icons/Entypo'
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5'
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6'
import DropDownPicker from 'react-native-dropdown-picker'
import { storage } from '../utils/storage'

type Memo = {
    id: number
    text: string
    time: string
    updatedAt: number | null
}

const MEMO_STORAGE_KEY = 'memoList'

const Home = () => {
    const [open, setOpen] = useState(false)
    const [timeOptions, setTimeOptions] = useState([
        { label: '시간 선택', value: 'none'},
        { label: '1분', value: '1' },
        { label: '3분', value: '3' },
        { label: '5분', value: '5' },
        { label: '10분', value: '10' },
        { label: '1시간', value: '60' },
        { label: '12시간', value: '720' },
        { label: '24시간', value: '1440' },
    ])
    const [memoList, setMemoList] = useState<Memo[]>([])
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const sortOptions = [
        { label: '등록 최신순', value: 'latest' },
        { label: '등록 오래된순', value: 'oldest' },
        { label: '삭제 임박순', value: 'urgent' },
        { label: '삭제 여유순', value: 'relaxed' },
    ]
    const [sortOpen, setSortOpen] = useState(false)
    const [selectedSort, setSelectedSort] = useState('latest')

    // const onPressSave = () => {
    //     setOpen(false)
    //     setSortOpen(false)
    //     Keyboard.dismiss()
    // }

    const onPressDelete = (id: number) => {
        setMemoList((prev) => prev.filter((item) => item.id !== id))
        setOpen(false)
        setSortOpen(false)
        Keyboard.dismiss()
    }

    const onPressNewCard = () => {
        const newMemo = {
            id: Date.now(),
            text: '',
            time: 'none',
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
                return list.sort((a, b) => parseInt(a.time) - parseInt(b.time))
            case 'relaxed':
                return list.sort((a, b) => parseInt(b.time) - parseInt(a.time))
            default:
                return list
        }
    }

    const onFocusTextInput = () => {
        setOpen(false)
        setSortOpen(false)
    }

    const onPressFilter = () => {
        setSortOpen((prev) => !prev)
        setOpen(false)
        Keyboard.dismiss()
    }

    const onOpenDropdown = (index: number) => {
        setSelectedIndex(index)
        Keyboard.dismiss()
    }

    useEffect(() => {
        const saved = storage.getString(MEMO_STORAGE_KEY)
        if(saved) {
            const parsed = JSON.parse(saved)
            const updatedList = parsed.map((memo: any) => ({
                ...memo,
                updatedAt: memo.updatedAt || null,
                time: memo.time || 'none'
            }))
            setMemoList(updatedList)
        }else{
            onPressNewCard()
        }
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            if(memoList.length === 0) {
                onPressNewCard()
            }else{
                storage.set(MEMO_STORAGE_KEY, JSON.stringify(memoList))
            }
        }, 100)

        return () => clearTimeout(timer)
    }, [memoList])

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now()
            setMemoList((prev) => {
                const updatedList = prev.filter((memo) => {
                    if(memo.time === 'none' || !memo.updatedAt) {
                        return true
                    }
                    const updatedAt = memo.updatedAt
                    const timeInMinutes = parseInt(memo.time)
                    const timeInMilliseconds = timeInMinutes * 60 * 1000
                    const expirationTime = updatedAt + timeInMilliseconds
                    return now < expirationTime
                })

                if(updatedList.length === 0) {
                    const newMemo: Memo = {
                        id: Date.now(),
                        text: '',
                        time: 'none',
                        updatedAt: null
                    }
                    updatedList.push(newMemo)
                }

                storage.set(MEMO_STORAGE_KEY, JSON.stringify(updatedList))
                return updatedList
            })
        }, 1000)
        return () => clearInterval(interval)
    })

    return (
        <TouchableWithoutFeedback
            onPress={() => {
                setOpen(false)
                setSortOpen(false)
                Keyboard.dismiss()
            }}
        >
            <SafeAreaView style={styles.safeContainer}>
                <KeyboardAvoidingView
                    behavior={'height'}
                    keyboardVerticalOffset={20}
                    style={styles.keyboardAvoidingView}
                >
                    <ScrollView 
                        nestedScrollEnabled={true} 
                        keyboardShouldPersistTaps="handled" 
                        showsVerticalScrollIndicator={false} 
                        contentContainerStyle={styles.scrollViewContentContainer}
                        contentInsetAdjustmentBehavior="automatic"
                    >
                        <View style={styles.titleHeaderRow}>
                            <Text style={styles.title}>블립노트</Text>
                            <View style={{ position: 'relative'}}>
                                <TouchableOpacity onPress={onPressFilter}>
                                    <FontAwesome6 name='sliders' size={25}/>
                                </TouchableOpacity>
                                {sortOpen && (
                                    <View style={styles.sortDropdownWrapper}>
                                        <DropDownPicker 
                                            open={true}
                                            value={selectedSort}
                                            items={sortOptions}
                                            setOpen={() => setSortOpen(true)}
                                            setValue={setSelectedSort}
                                            setItems={(() => {})}
                                            style={{ display: 'none' }}
                                            dropDownContainerStyle={styles.sortDropdownContainer}
                                            textStyle={{ fontSize: 14 }}
                                            placeholder='정렬 선택'
                                            listMode='SCROLLVIEW'
                                            onClose={() => setSortOpen(false)}
                                            showArrowIcon={false}
                                        />
                                    </View>
                                )}
                            </View>
                        </View>
                        {getSortedMemoList().map((memoItem, index) => (
                            <Card key={memoItem.id} containerStyle={[styles.card, {zIndex: selectedIndex === index ? 1000 : 1}]}>
                                <View style={styles.headerRow}>
                                    <View style={styles.pickerContainer}>
                                        <View>
                                            <DropDownPicker 
                                                open={open && selectedIndex === index}
                                                value={memoItem.time}
                                                items={timeOptions}
                                                setOpen={setOpen}
                                                onOpen={() => onOpenDropdown(index)}
                                                onClose={() => setSelectedIndex(null)}
                                                setValue={(callback) => {
                                                    const newValue = callback(memoItem.time)
                                                    setMemoList((prev) => 
                                                        prev.map((item) => 
                                                            item.id === memoItem.id 
                                                                ? { 
                                                                    ...item, 
                                                                    time: newValue,
                                                                    updatedAt: newValue === 'none' ? null : Date.now()
                                                                  } 
                                                                : item
                                                        )
                                                    )
                                                }}
                                                setItems={setTimeOptions}
                                                style={styles.dropdown}
                                                dropDownContainerStyle={styles.dropdownContainer}
                                                textStyle={{ fontSize: 14 }}
                                                labelStyle={{ color: '#36454F' }}
                                                selectedItemLabelStyle={{ fontWeight: 'bold' }}
                                                placeholder="시간 선택"
                                                listMode="SCROLLVIEW"
                                                closeOnBackPressed={true}
                                            />
                                        </View>
                                        <Text style={{ color: '#36454F', marginTop: 12, marginLeft: 7}}>후 자동 삭제</Text>
                                    </View>
                                    <View style={styles.buttonGroup}>
                                        {/* <TouchableOpacity onPress={onPressSave}>
                                            <Entypo name='save' size={25} color="#708090" />
                                        </TouchableOpacity> */}
                                        <TouchableOpacity onPress={() => onPressDelete(memoItem.id)}>
                                            <FontAwesome5 name='trash-alt' size={25} color="#CD5C5C" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <TextInput 
                                    style={styles.memoInput}
                                    multiline
                                    placeholder={`잠깐 기록할 메모를 입력하세요!\n(500자까지만 메모가 가능합니다)\n(메모 시 바로 자동 저장됩니다)`}
                                    value={memoItem.text}
                                    maxLength={500}
                                    onChangeText={(text) => {
                                        setMemoList((prev) => 
                                            prev.map((item) => 
                                                item.id === memoItem.id ? { ...item, text } : item
                                            )
                                        )
                                    }}
                                    onFocus={onFocusTextInput}
                                />
                            </Card>
                        ))}
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.fab}
                        onPress={onPressNewCard}
                    >
                        <FontAwesome6 name='plus' size={25} color="#DDD" />
                    </TouchableOpacity>
                </KeyboardAvoidingView>
                <View style={styles.adBanner}>
                    <Text style={styles.adText}>배너 광고 영역</Text>
                </View>
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
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    scrollViewContentContainer: {
        flexGrow: 1,
        marginTop: 20,
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
        marginBottom: 8
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
        elevation: 3
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
        elevation: 3
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 10, 
        paddingRight: 10, 
        marginTop: 10
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
})

export default Home